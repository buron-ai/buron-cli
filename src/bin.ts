import { Command } from "commander";
import { linkCommand } from "./commands/link.js";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { setupCommand } from "./commands/setup.js";
import { setupCiCommand } from "./commands/setup-ci.js";
import { syncCommand } from "./commands/sync.js";
import { banner } from "./lib/ui.js";

const VERSION = process.env.BURON_VERSION ?? "dev";

const program = new Command();

program
  .name("buron")
  .description("Connect your codebase to Buron and generate marketing assets when you ship")
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
  .command("sync")
  .description("Refresh the launch skill in your installed editor folders")
  .action(syncCommand);

program
  .command("setup-ci")
  .description("Set up GitHub Actions for automated launches")
  .action(setupCiCommand);

program.parse();
