// bring up the specified environment according to the instructions in deploy.json
var cp = require('child_process'),
  patterns = require('../patterns'),
  _ = require('underscore')

module.exports = function(deployData,argv) {

  console.log("Start")
  console.log(deployData)

  var environment = argv.shift()
  if (!environment) environment = 'development'

  _.each(deployData.resources,function(resource,index) {
    patterns.load(resource['pattern'],function(pattern) {
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

}