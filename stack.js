#! /usr/bin/env node

var _ = require('underscore'),
  fs = require('fs-extra'),
  path = require('path'),
  nopt = require('nopt');

var nodebin = process.argv.shift()
var scriptname = process.argv.shift()
var command = process.argv.shift()

var commands = ['add', 'create', 'deploy', 'help', 'login', 'start', 'stop']

// no command
if (!command) {
  console.log("\nUsage: stack <command>\n" +
    "Where <command> is one of: " + commands.join(', ') + "\n" +
    "Try 'stack help <command>' for more information\n")
  return;
}

// invalid command
if(!_.contains(commands,command)) {
  console.log("\nUnrecognized command '" + command + "'")
  return;
}

// help does not require a deploy file
if(command == 'help') {
  require('./commands/help')({},process.argv)
  return;
}

// invalid execution location
fs.readJson('./deploy.json',function(er,deployData) {
  if (er) {
    console.log("Error parsing deploy.json: " + er)
    return;
  }
  require('./commands/'+command)(deployData,process.argv)
})