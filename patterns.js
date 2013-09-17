/**
 * Load patterns. At the moment we only handle built-ins.
 * Later we will load these remotely when appropriate.
 * @type {*}
 */

var fs = require('fs-extra')

exports.load = function(patternName,cb) {
  var patternPath = __dirname + '/patterns/'+patternName+'.json'
  fs.readJson(patternPath, function(er,data) {
    if (er) {
      console.log(er)
      throw new Error("Pattern " + patternName + " not found")
    }
    cb(data)
  })
}