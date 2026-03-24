import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, input } from "@inquirer/prompts";
import { requireAuth } from "../lib/auth.js";
import { readConfig } from "../lib/config.js";
import { getContextPath, getLaunchesDir, getProjectDir } from "../lib/paths.js";
import { blank, bold, error, info, success } from "../lib/ui.js";
import { CONTEXT_TEMPLATE } from "../templates/context.js";
import { LAUNCH_BURON_PROMPT } from "../templates/launch-buron.js";


export async function setupCommand(): Promise<void> {
  try {
    requireAuth();

    const config = readConfig();
    if (!config) {
      error("Not linked. Run `buron link` first.");
      process.exit(1);
    }

    const projectDir = getProjectDir();
    const contextPath = getContextPath();
    const launchesDir = getLaunchesDir();

    // Scaffold .buron/ directory
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }

    if (!existsSync(launchesDir)) {
      mkdirSync(launchesDir, { recursive: true });
    }

    // Generate context.md
    if (existsSync(contextPath)) {
      info("context.md already exists, skipping.");
    } else {
      blank();
      const fillNow = await confirm({
        message: "Set up your project context now? (you can edit it later)",
        default: true,
      });

      if (fillNow) {
        const product = await input({
          message: "What does your product do?",
        });

        const audience = await input({
          message: "Who is your target audience?",
        });

        const tone = await input({
          message: "What tone should marketing use? (e.g. professional, casual, technical)",
          default: "professional but approachable",
        });

        const content = CONTEXT_TEMPLATE.replace("{{product}}", product)
          .replace("{{audience}}", audience)
          .replace("{{tone}}", tone);

        writeFileSync(contextPath, content, "utf-8");
      } else {
        writeFileSync(contextPath, CONTEXT_TEMPLATE_BLANK, "utf-8");
        info("Fill in .buron/context.md when you're ready.");
      }

      success("Created .buron/context.md");
    }

    // Install IDE slash commands
    const cwd = process.cwd();
    let installed = false;

    const claudeDir = join(cwd, ".claude", "commands");
    if (existsSync(join(cwd, ".claude")) || existsSync(claudeDir)) {
      mkdirSync(claudeDir, { recursive: true });
      writeFileSync(join(claudeDir, "launch-buron.md"), LAUNCH_BURON_PROMPT, "utf-8");
      success("Installed /launch-buron command for Claude Code");
      installed = true;
    }

    const cursorDir = join(cwd, ".cursor", "commands");
    if (existsSync(join(cwd, ".cursor")) || existsSync(cursorDir)) {
      mkdirSync(cursorDir, { recursive: true });
      writeFileSync(join(cursorDir, "launch-buron.md"), LAUNCH_BURON_PROMPT, "utf-8");
      success("Installed /launch-buron command for Cursor");
      installed = true;
    }

    if (!installed) {
      const installBoth = await confirm({
        message: "No IDE config detected. Install /launch-buron for both Claude Code and Cursor?",
        default: true,
      });

      if (installBoth) {
        mkdirSync(join(cwd, ".claude", "commands"), { recursive: true });
        writeFileSync(
          join(cwd, ".claude", "commands", "launch-buron.md"),
          LAUNCH_BURON_PROMPT,
          "utf-8",
        );
        mkdirSync(join(cwd, ".cursor", "commands"), { recursive: true });
        writeFileSync(
          join(cwd, ".cursor", "commands", "launch-buron.md"),
          LAUNCH_BURON_PROMPT,
          "utf-8",
        );
        success("Installed /launch-buron for Claude Code and Cursor");
      }
    }

    blank();
    success(`You're all set. Run ${bold("/launch-buron")} in your IDE.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}

const CONTEXT_TEMPLATE_BLANK = `# Project Context

## Product
<!-- What does your product do? -->

## Audience
<!-- Who is your target audience? -->

## Tone
<!-- What tone should marketing content use? -->

## Key Features
<!-- List the main features or selling points -->

## Additional Context
<!-- Anything else Buron should know when generating marketing assets -->
`;
