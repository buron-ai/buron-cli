import { Command } from "commander";
import {
  dashboardsListCommand,
  dashboardsRunCommand,
  integrationCommand,
  queriesCreateCommand,
  queriesListCommand,
  queriesRunCommand,
  queryCommand,
} from "./commands/data.js";
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
  .description(
    "Turn code changes into launch-ready marketing — capture what you ship, and let Buron generate the assets.",
  )
  .version(VERSION)
  .hook("preAction", () => {
    banner(VERSION);
  });

program
  .command("login")
  .description("Log in to Buron (opens browser)")
  .action(loginCommand);

program.command("logout").description("Clear stored credentials").action(logoutCommand);

program.command("link").description("Link the current repo to a Buron team").action(linkCommand);

program
  .command("setup")
  .description("Log in, link this repo, create Buron files, and install editor skills")
  .action(setupCommand);

program
  .command("setup-ci")
  .description("Set up GitHub Actions to run launches automatically")
  .action(setupCiCommand);

const skills = program.command("skills").description("Manage installed skills");

skills
  .command("update")
  .description("Refresh installed skills with the latest templates")
  .action(skillsUpdateCommand);

const file = program.command("file").description("Read and write files in your team's library");

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
  .description("Search file contents by regex")
  .option("-d, --directory <dir>", "Limit search to this directory")
  .action(fileGrepCommand);

file.command("delete <path>").description("Delete a file").action(fileDeleteCommand);

file.command("move <from> <to>").description("Move or rename a file").action(fileMoveCommand);

file
  .command("replace <path>")
  .description("Find and replace text in a file")
  .requiredOption("-o, --old <text>", "String to find")
  .requiredOption("-n, --new <text>", "Replacement string")
  .option("-a, --all", "Replace all occurrences (default: first only)")
  .action(fileReplaceCommand);

// ── query ───────────────────────────────────────────────────────────

program
  .command("query <queryString>")
  .description("Execute an ad-hoc query against a connected data source")
  .requiredOption("-s, --source <source>", "Query source (e.g. gaql)")
  .option("--from <date>", "Start date (YYYY-MM-DD)")
  .option("--to <date>", "End date (YYYY-MM-DD)")
  .action(queryCommand);

// ── queries ─────────────────────────────────────────────────────────

const queries = program.command("queries").description("Manage saved queries");

queries
  .command("list")
  .description("List saved queries")
  .option("-s, --source <source>", "Filter by source")
  .action(queriesListCommand);

queries
  .command("create <name>")
  .description("Create a saved query")
  .requiredOption("-s, --source <source>", "Query source (e.g. gaql)")
  .requiredOption("-q, --query <queryString>", "The query string")
  .option("--config <json>", "Chart/display config as JSON")
  .action(queriesCreateCommand);

queries
  .command("run <id>")
  .description("Execute a saved query and return fresh results")
  .action(queriesRunCommand);

// ── dashboards ──────────────────────────────────────────────────────

const dashboards = program.command("dashboards").description("View and run dashboards");

dashboards
  .command("list")
  .description("List available dashboards")
  .action(dashboardsListCommand);

dashboards
  .command("run <id>")
  .description("Run a dashboard for a date range")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD)")
  .option("--fresh", "Bypass cache")
  .action(dashboardsRunCommand);

// ── integration ─────────────────────────────────────────────────────

program
  .command("integration <provider>")
  .description("Check connection status of an integration")
  .action(integrationCommand);

program.parse();
