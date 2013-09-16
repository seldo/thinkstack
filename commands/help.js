// add new elements to the stack

module.exports = function(nothing,argv) {

  var subcommand = argv.shift()

  if (!subcommand) {
    console.log(
        "Basic commands:\n" +
        "add      add a new component to the current stack\n" +
        "create   begin a new stack\n" +
        "deploy   push the specified version of the stack to an environment\n" +
        "help     show this message\n" +
        "login    supply your credentials to thinkstack to allow deployments\n" +
        "start    start components in the local environment\n" +
        "stop     stop components in the local environment\n"
    )
    return;
  }

  // TODO: other commands here

}