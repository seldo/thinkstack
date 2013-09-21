var async = require('async')

var tasks = [
  function(cb) {
    console.log("one")
    cb(null,'ok')
  },
  function(cb) {
    console.log("two")
    cb('bad',null)
  }
]

async.parallel(
  tasks,
  function(er,results) {
    console.log("er")
    console.log(er)
    console.log("results")
    console.log(results)
  }
)