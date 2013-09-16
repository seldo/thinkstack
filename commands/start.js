// bring up the specified environment according to the instructions in deploy.json
var cp = require('child_process'),
  patterns = require('../patterns')

module.exports = function(deployData,argv) {

  console.log("Start")
  console.log(deployData)

  var environment = argv.shift()
  if (!environment) environment = 'development'

  deployData.resources.forEach(function(resource,index) {
    patterns.load(resource['pattern'],function(pattern) {
      var start = pattern['start']
      if (environment == 'development' && pattern['startdev']) {
        start = pattern['startdev']
      }
      var commands = []
      commands.push("cd /vagrant/" + pattern['location'])
      commands.push(start)
      cp.exec(
        'vagrant ssh -c ' + commands.join('; '),
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