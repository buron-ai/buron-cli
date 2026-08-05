import { Command } from "commander";
import {
  dashboardsAddCommand,
  dashboardsListCommand,
  dashboardsRunCommand,
  datasetsDescribeCommand,
  datasetsListCommand,
  datasetsQueryCommand,
  integrationCommand,
  queriesCreateCommand,
  queriesListCommand,
  queriesRunCommand,
  sqlCommand,
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

program.command("login").description("Log in to Buron (opens browser)").action(loginCommand);

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

// ── datasets ────────────────────────────────────────────────────────

function collect(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}

const datasets = program.command("datasets").description("Discover and query your data");

datasets
  .command("list")
  .description("List datasets this team can query, with availability")
  .option("--json", "Output raw JSON")
  .action(datasetsListCommand);

datasets
  .command("describe <id>")
  .description("Show a dataset's metrics, dimensions, and filter operators")
  .action(datasetsDescribeCommand);

datasets
  .command("query <id>")
  .description("Run a query by picking measures, dimensions, and filters — no SQL")
  .option("-m, --measures <a,b>", "Metric field keys (comma-separated)")
  .option("-d, --dimensions <x,y>", "Dimension field keys (comma-separated)")
  .option("-f, --filter <field:op:value>", "Filter (repeatable)", collect, [])
  .option("--from <date>", "Start date (YYYY-MM-DD)")
  .option("--to <date>", "End date (YYYY-MM-DD)")
  .option("--granularity <grain>", "day|week|month|quarter|year")
  .option("--sort <field:dir>", "Sort (repeatable)", collect, [])
  .option("--limit <n>", "Max rows")
  .option("--spec <file|->", "Full SemanticQuery JSON (overrides flags)")
  .option("--json", "Output raw JSON")
  .action(datasetsQueryCommand);

// ── sql (warehouse escape hatch) ────────────────────────────────────

program
  .command("sql <statement>")
  .description("Run a read-only SELECT against your warehouse (prefer datasets query)")
  .option("--json", "Output raw JSON")
  .action(sqlCommand);

// ── queries ─────────────────────────────────────────────────────────

const queries = program.command("queries").description("Manage saved queries");

queries
  .command("list")
  .description("List saved queries")
  .option("--dataset <id>", "Filter by dataset id")
  .option("--json", "Output raw JSON")
  .action(queriesListCommand);

queries
  .command("create <name>")
  .description("Save a structured query from a SemanticQuery spec")
  .requiredOption("--spec <file|->", "SemanticQuery JSON (dataset + picks)")
  .option("--chart <kind>", "table|line|bar|area|donut")
  .action(queriesCreateCommand);

queries
  .command("run <id>")
  .description("Execute a saved query and return fresh results")
  .option("--json", "Output raw JSON")
  .action(queriesRunCommand);

// ── dashboards ──────────────────────────────────────────────────────

const dashboards = program.command("dashboards").description("View and run dashboards");

dashboards
  .command("list")
  .description("List available dashboards")
  .option("--json", "Output raw JSON")
  .action(dashboardsListCommand);

dashboards
  .command("run <id>")
  .description("Run a dashboard for a date range")
  .requiredOption("--from <date>", "Start date (YYYY-MM-DD)")
  .requiredOption("--to <date>", "End date (YYYY-MM-DD)")
  .option("--fresh", "Bypass cache")
  .action(dashboardsRunCommand);

dashboards
  .command("add <dashboardId> <queryId>")
  .description("Add a saved query as a tile on a custom dashboard")
  .action(dashboardsAddCommand);

// ── integration ─────────────────────────────────────────────────────

program
  .command("integration <provider>")
  .description("Check connection status of an integration")
  .action(integrationCommand);

program.parse();
