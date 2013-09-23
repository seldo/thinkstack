var cp = require('child_process'),
  fs = require('fs-extra')

var metadir = process.cwd() + '/.stack/'

exports.isRunning = function(name,cb) {
  verifyMetadataDir(function() {
    hasPointerFile(name,function(exists) {
      if (exists) {
        var containerId = exports.getId(name)
        // check it's actually running
        var command = 'vagrant ssh -c "sudo docker ps -q | grep ' + containerId + '"'
        console.log("Running: " + command)
        cp.exec(
          command,
          function(er,stdout,stderr) {
            if(er) {
              console.log("Failed checking running status of " + name)
              console.log(er)
              cb(false)
            } else {
              var checkOutput = stdout.trim();
              cb(checkOutput == containerId)
            }
          }
        )
      } else {
        cb(false)
      }
    })
  })
}

exports.setRunning = function(name,containerId) {
  console.log("Writing " + containerId + " to " + getPointerFilePath(name))
  return fs.writeFileSync(getPointerFilePath(name),containerId)
}

exports.getId = function(name) {
  var data = fs.readFileSync(getPointerFilePath(name))
  return data.toString().trim()
}

var hasPointerFile = function(name,cb) {
  fs.exists(getPointerFilePath(name),cb)
}

var getPointerFilePath = function(name) {
  return metadir + name + '.cid'
}

var verifyMetadataDir = function(cb) {
  fs.exists(metadir,function(exists) {
    if (exists) {
      cb()
    } else {
      fs.mkdirp(metadir,function(er) {
        if(er) {
          throw new Error("Failed to create container metadata directory " + metadir)
        } else {
          cb()
        }
      })
    }
  })
}