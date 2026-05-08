import { Command } from "commander";
import {
  fileAppendCommand,
  fileDeleteCommand,
  fileGlobCommand,
  fileGrepCommand,
  fileListCommand,
  fileMoveCommand,
  fileReadCommand,
  fileReplaceCommand,
  fileWriteCommand,
} from "./commands/file.js";
import { linkCommand } from "./commands/link.js";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { setupCommand } from "./commands/setup.js";
import { setupCiCommand } from "./commands/setup-ci.js";
import { skillsUpdateCommand } from "./commands/skills.js";
import { banner } from "./lib/ui.js";

const VERSION = process.env.BURON_VERSION ?? "dev";

const program = new Command();

program
  .name("buron")
  .description("Headless interface to the Buron marketing platform — auth, link, file CRUD over the team's library, skill management, and CI bootstrap.")
  .version(VERSION)
  .hook("preAction", () => {
    banner(VERSION);
  });

program
  .command("login")
  .description("Authenticate with Buron (opens browser)")
  .action(loginCommand);

program.command("logout").description("Clear stored credentials").action(logoutCommand);

program.command("link").description("Link the current repo to a Buron team").action(linkCommand);

program
  .command("setup")
  .description("Log in, link this repo, scaffold Buron files, and install editor skills")
  .action(setupCommand);

program
  .command("setup-ci")
  .description("Set up GitHub Actions for automated launches")
  .action(setupCiCommand);

const skills = program.command("skills").description("Manage installed Buron skills");

skills
  .command("update")
  .description("Refresh installed skills with the latest templates")
  .action(skillsUpdateCommand);

const file = program.command("file").description("Read and write files in Buron's knowledge layer");

file.command("read <path>").description("Read a file by path").action(fileReadCommand);

file
  .command("write <path>")
  .description("Write a file (content from --content or stdin)")
  .option("-c, --content <text>", "File content (otherwise read from stdin)")
  .option("-f, --from-file <localPath>", "Read content from a local file")
  .action(fileWriteCommand);

file
  .command("append <path>")
  .description("Append to an existing file")
  .option("-c, --content <text>", "Content to append (otherwise read from stdin)")
  .option("-f, --from-file <localPath>", "Read content from a local file")
  .action(fileAppendCommand);

file.command("list [directory]").description("List files in a directory").action(fileListCommand);

file
  .command("glob <pattern>")
  .description("Find files matching a glob pattern")
  .action(fileGlobCommand);

file
  .command("grep <pattern>")
  .description("Search file contents for a regex pattern")
  .option("-d, --directory <dir>", "Limit search to this directory")
  .action(fileGrepCommand);

file.command("delete <path>").description("Delete a file").action(fileDeleteCommand);

file.command("move <from> <to>").description("Move or rename a file").action(fileMoveCommand);

file
  .command("replace <path>")
  .description("Find and replace a string within a file")
  .requiredOption("-o, --old <text>", "String to find")
  .requiredOption("-n, --new <text>", "Replacement string")
  .option("-a, --all", "Replace all occurrences (default: first only)")
  .action(fileReplaceCommand);

program.parse();
