import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { logoutCommand } from "./commands/logout.js";
import { linkCommand } from "./commands/link.js";
import { setupCommand } from "./commands/setup.js";
import { pushCommand } from "./commands/push.js";
import { setupCiCommand } from "./commands/setup-ci.js";

const program = new Command();

program
  .name("buron")
  .description("Connect your codebase to Buron and generate marketing assets when you ship")
  .version("0.1.0");

program
  .command("login")
  .description("Authenticate with Buron (opens browser)")
  .action(loginCommand);

program
  .command("logout")
  .description("Clear stored credentials")
  .action(logoutCommand);

program
  .command("link")
  .description("Link the current repo to a Buron team")
  .action(linkCommand);

program
  .command("setup")
  .description("Scaffold .buron/ directory and install IDE commands")
  .action(setupCommand);

program
  .command("push")
  .description("Upload context and launch files to Buron")
  .action(pushCommand);

program
  .command("setup-ci")
  .description("Set up GitHub Actions for automated launches")
  .action(setupCiCommand);

program.parse();
