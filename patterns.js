var fs = require('fs-extra')

exports.load = function(patternName,cb) {
  fs.readJson('./patterns/'+patternName)
}