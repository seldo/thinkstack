// bring up the specified environment according to the instructions in deploy.json
var cp = require('child_process'),
    fs = require('fs-extra'),
  patterns = require('../patterns'),
  _ = require('underscore'),
  async = require('async')

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
      // what to look at
      deployData.resources,
      // what to do with each one
      function(resource,name) {
        return function(cb) {
          patterns.load(resource.pattern,function(pattern) {
            cp.exec(
              "vagrant ssh -c 'sudo docker run -d -v \'/vagrant/" + resource.location + resource.image + "'",
              function(er,stdout,stderr) {
                if(er) {
                  console.log("Failed starting container for " + name)
                  cb(er)
                }
              }
            )
          })
        }

      },
      // when done with them all:
      function(er) {
        connectContainers(deployData)
      }
    )
  })

  /*
  _.each(deployData.resources,function(resource,index) {

      var start = pattern['start']
      if (environment == 'development' && pattern['devstart']) {
        start = pattern['devstart']
      }
      var commands = []
      commands.push("sudo su")
      if(resource['location']) {
        commands.push("cd /vagrant/" + resource['location'])
      }
      commands.push(start)
      var fullCommand = 'vagrant ssh -c \'' + commands.join('; ') + '\''
      console.log(fullCommand)
      cp.exec(
        fullCommand,
        function (error, stdout, stderr) {
          console.log('stdout: ' + stdout);
          console.log('stderr: ' + stderr);
          if (error !== null) {
            console.log('exec error: ' + error);
          }
        }
      )
    })
  })
  */

}

var maxTries = 3
var startVagrant = function(tries,cb) {
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

var initVagrant = function(tries,cb) {
  fs.copy(__dirname + "/../scripts/Vagrantfile",vagrantFilePath,function(er) {
    if(er) {
      console.log(er)
      throw new Error("Could not copy Vagrant file to current root")
    } else {
      tries++
      startVagrant(tries,cb)
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

var connectContainers = function(deployData) {

}

