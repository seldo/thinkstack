// bring up the specified environment according to the instructions in deploy.json
var cp = require('child_process'),
    fs = require('fs-extra'),
  patterns = require('../patterns'),
  _ = require('underscore'),
  async = require('async'),
  containers = require('../containers')


module.exports = function(deployData,argv) {

  console.log("Start")
  console.log(deployData)

  var environment = argv.shift()
  if (!environment) environment = 'development'

  startVagrant(0,function() {

    var containerIds = {}

    // start all containers

    // need to work out how to start each one
    var containerStarters = _.map(
      // list of resources
      deployData.resources,
      // what to return for each one
      function(resource,name) {
        return function(cb) { // this is the one passed to parallel() below, cb goes there
          if(containers.isRunning(name)) {
            cb(null,{"name": name, "id": containers.getId(name)})
          } else {
            patterns.load(resource.pattern,function(pattern) {
              var command = 'vagrant ssh -c "sudo docker run -d -v \'/vagrant/' + resource.location + ':/home/thinkstack\' ' + pattern.image + '"'
              console.log("Running: " + command)
              cp.exec(
                command,
                function(er,stdout,stderr) {
                  if(er) {
                    console.log("Failed starting container for " + name)
                    console.log(er)
                    cb(er)
                  } else {
                    var containerId = stdout.trim();
                    console.log("Started container " + name + ", output was " + stdout + "stderr=[" + stderr + "]")
                    containers.setRunning(name)
                    cb(null,{"name": name, "id": containerId})
                  }
                }
              )
            })
          }
        }

      }
    )

    /* TODO: devstart
     var start = pattern['start']
     if (environment == 'development' && pattern['devstart']) {
     start = pattern['devstart']
     }
     var commands = []
     commands.push("cd /vagrant/" + resource['location'])
     */

    // now actually start them. Docker doesn't like running in parallel with itself.
    async.series(
      // run all of these
      containerStarters,
      // and then run this with what they send back
      function(er,containerObjects) {
        if (er) {
          console.log("One or more containers failed to start. You should find out why. Moving on... [" + er + "]")
        }
        connectContainers(deployData,containerObjects)
    })
  })
}

var maxTries = 3
var startVagrant = function(tries,cb) {
  tries++
  if (tries > maxTries) {
    throw new Error("Could not start vagrant")
  }
  console.log("Starting vagrant... (this can take a few minutes the first time)")
  cp.exec(
    "vagrant up",
    function(er,stdout,stderr) {
      if(er) {
        if (stdout.indexOf("A Vagrant environment is required")) {
          if (vagrantExists()) {
            throw new Error("Vagrantfile exists but not accepted by vagrant")
          } else {
            initVagrant(tries,cb)
          }
        } else {
          console.log(er)
          throw new Error("Failed to start vagrant")
        }
      } else {
        cb() // success!
      }
    }
  )
}

var vagrantFilePath = process.cwd()+'/Vagrantfile'

var vagrantExists = function() {
  return fs.existsSync(vagrantFilePath)
}

// creates a default vagrant file and then starts vagrant
var initVagrant = function(tries,cb) {
  console.log("No Vagrant file found; creating a default file and trying again.")
  fs.copy(__dirname + "/../scripts/Vagrantfile",vagrantFilePath,function(er) {
    if(er) {
      console.log(er)
      throw new Error("Could not copy Vagrant file to current root")
    } else {
      startVagrant(tries,function() {
        installPlumbing(cb)
      })
    }
  })
}

// puts pipework into the running vagrant instance
var installPlumbing = function(cb) {
  cp.exec(
    __dirname + "/../scripts/vagrant-scp.sh " + __dirname + "/../scripts/pipework.sh default:/home/vagrant/.",
    function(er,stdout,stderr) {
      if (er) {
        console.log(er);
        throw new Error("Failed to bootstrap pipework into vagrant")
      } else {
        cb()
      }
    }
  )
}

// create bridges between any two containers that require it
var connectContainers = function(deployData,containerObjects) {

  console.log("Container objects")
  console.log(containerObjects)

  // map the container objects into a ...map. Of container IDs indexed by name.
  var containerIds = _.object(
    _.filter(
      _.map(
        containerObjects,
        function(co){
          if(co) {
            return [co.name, co.id]
          }
        }
      ),
      function(o) {return o} // filters out values like null and undefined
    )
  )

  _.each(deployData.resources,function(fromResource,fromName,index) {
    if (fromResource['connect-to'] && fromResource['connect-to'].length > 0) {
      fromResource['connect-to'].forEach(function(toName,index) {
        var baseError = "Resource " + fromName + " can't be connected to " + toName + ". "
        var toResource = deployData.resources[toName]
        if (!toResource) {
          console.log(baseError + "Can't find resource " + toName)
          return
        }
        if (!containerIds[fromName]) {
          console.log(baseError + "Can't find a container ID for " + fromName)
          return
        }
        if (!containerIds[toName]) {
          console.log(baseError + "Can't find a container ID for " + toName)
        }
        if (!fromResource['ip']) {
          console.log(baseError + "Can't find IP for " + fromName)
          return
        }
        if (!toResource['ip']) {
          console.log(baseError + "Can't find IP for " + toName)
          return
        }
        var bridgeName = "br" + index
        var connectA = "sh pipework.sh " + bridgeName + " " + containerIds[fromName] + " " + fromResource['ip']
        var connectB = "sh pipework.sh " + bridgeName + " " + containerIds[toName] + " " + toResource['ip']
        var connectCommandA = "vagrant ssh -c '" + connectA + "'"
        var connectCommandB = "vagrant ssh -c '" + connectB + "'"
        cp.exec(
          connectCommandA,
          function (er, stdout, stderr) {
            if (er) {
              console.log(baseError + "\n" + stderr)
              console.log(stdout)
            } else {
              cp.exec(
                connectCommandB,
                function(er, stdout, stderr) {
                  if (er) {
                    console.log(baseError + "\n" + stderr)
                    console.log(stdout)
                  }
                }
              )
            }
          }
        )
      })
    }
  })

}

