import { execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, select } from "@inquirer/prompts";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { api } from "../lib/api.js";
import { getRepoName } from "../lib/git.js";
import { blank, bold, dim, error, info, link, spinner, success, warn } from "../lib/ui.js";
import { WORKFLOW_CLAUDE } from "../templates/workflow-claude.js";
import { WORKFLOW_CURSOR } from "../templates/workflow-cursor.js";

function hasGhCli(): boolean {
  try {
    execSync("gh auth status", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getGhRepoName(): string | null {
  try {
    const output = execSync("gh repo view --json nameWithOwner -q .nameWithOwner", {
      stdio: "pipe",
      encoding: "utf-8",
    });
    return output.trim() || null;
  } catch {
    return null;
  }
}

export async function setupCiCommand(): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const ghAvailable = hasGhCli();

    blank();

    // Step 1: Detect environment
    if (ghAvailable) {
      success("GitHub CLI detected");
    } else {
      warn("GitHub CLI not found — some steps will need to be done manually");
    }

    const repoName = ghAvailable ? getGhRepoName() : getRepoName();
    if (repoName) {
      success(`Repository: ${repoName}`);
    } else {
      warn("Could not detect repository name");
    }

    // Step 2: Generate BURON_TOKEN
    const s = spinner("Generating BURON_TOKEN...");
    s.start();
    const tokenResult = await api.generateToken(config.orgId, config.teamId, auth.token);
    s.stop();

    // Step 3: Set secret
    if (ghAvailable) {
      try {
        execSync(`gh secret set BURON_TOKEN --body "${tokenResult.token}"`, { stdio: "pipe" });
        success("BURON_TOKEN secret set");
      } catch {
        warn("Failed to set BURON_TOKEN via gh CLI");
        blank();
        info("Add this secret manually:");
        info(`  BURON_TOKEN: ${tokenResult.token}`);
      }
    } else {
      blank();
      info("Add these secrets to your repository:");
      if (repoName) {
        info(`  ${link(`https://github.com/${repoName}/settings/secrets/actions`)}`);
      }
      blank();
      info(`  BURON_TOKEN:       ${tokenResult.token}`);
    }

    // Step 4: Choose agent
    blank();
    const agent = await select({
      message: "Which AI agent do you use in CI?",
      choices: [
        { name: "Claude Code", value: "claude-code" as const },
        { name: "Cursor", value: "cursor" as const },
      ],
    });

    // Step 5: Write workflow file
    const workflowDir = join(process.cwd(), ".github", "workflows");
    const workflowPath = join(workflowDir, "buron.yml");

    if (!existsSync(workflowDir)) {
      mkdirSync(workflowDir, { recursive: true });
    }

    const template = agent === "claude-code" ? WORKFLOW_CLAUDE : WORKFLOW_CURSOR;
    writeFileSync(workflowPath, template, "utf-8");
    success("Workflow file created at .github/workflows/buron.yml");

    // Step 6: Guide API key setup
    blank();
    const apiKeyName = agent === "claude-code" ? "ANTHROPIC_API_KEY" : "CURSOR_API_KEY";
    info(`One last step — add your API key as a GitHub secret:`);
    blank();

    if (ghAvailable) {
      info(`  ${bold(`gh secret set ${apiKeyName}`)}`);
      blank();
      info(dim("(This will prompt you securely for the value)"));
    } else {
      info(`  ${apiKeyName}: <your ${agent === "claude-code" ? "Anthropic" : "Cursor"} API key>`);
    }

    // Step 7: Offer to commit
    blank();
    const shouldCommit = await confirm({
      message: "Commit and push the workflow file?",
      default: false,
    });

    if (shouldCommit) {
      try {
        execSync("git add .github/workflows/buron.yml", { stdio: "pipe" });
        execSync('git commit -m "Add Buron CI workflow"', { stdio: "pipe" });
        execSync("git push", { stdio: "pipe" });
        success("Workflow committed and pushed");
      } catch {
        warn("Failed to commit. The file is ready at .github/workflows/buron.yml");
      }
    } else {
      info("Workflow file is ready to commit when you're ready.");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
