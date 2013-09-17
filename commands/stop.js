// stop all the things
var cp = require('child_process'),
  patterns = require('../patterns'),
  _ = require('underscore')

module.exports = function(deployData,argv) {

  console.log("Stop")
  console.log(deployData)

  var environment = argv.shift()
  if (!environment) environment = 'development'

  _.each(deployData.resources,function(resource,index) {
    patterns.load(resource['pattern'],function(pattern) {
      var stop = pattern['stop']
      var commands = []
      commands.push("sudo su")
      commands.push(stop)
      var fullCommand = 'vagrant ssh -c "' + commands.join('; ') + '"'
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

}