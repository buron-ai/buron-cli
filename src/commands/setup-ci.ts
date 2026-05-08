import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, select } from "@inquirer/prompts";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { getRepoName } from "../lib/git.js";
import { blank, bold, error, info, link, success, warn } from "../lib/ui.js";
import { CURSOR_LAUNCH_SCRIPT } from "../templates/cursor-launch-script.js";
import { OPENAI_LAUNCH_SCRIPT } from "../templates/openai-launch-script.js";
import { WORKFLOW_CLAUDE } from "../templates/workflow-claude.js";
import { WORKFLOW_CURSOR } from "../templates/workflow-cursor.js";
import { WORKFLOW_OPENAI } from "../templates/workflow-openai.js";

type Agent = "claude-code" | "cursor" | "codex";

interface AgentSpec {
  label: string;
  apiKeyName: string;
  providerLabel: string;
  consoleUrl: string | null;
  workflow: string;
  ciScript: string | null;
}

const AGENTS: Record<Agent, AgentSpec> = {
  "claude-code": {
    label: "Claude Code",
    apiKeyName: "ANTHROPIC_API_KEY",
    providerLabel: "Anthropic",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    workflow: WORKFLOW_CLAUDE,
    ciScript: null,
  },
  cursor: {
    label: "Cursor",
    apiKeyName: "CURSOR_API_KEY",
    providerLabel: "Cursor",
    consoleUrl: null,
    workflow: WORKFLOW_CURSOR,
    ciScript: CURSOR_LAUNCH_SCRIPT,
  },
  codex: {
    label: "OpenAI Codex",
    apiKeyName: "OPENAI_API_KEY",
    providerLabel: "OpenAI",
    consoleUrl: "https://platform.openai.com/api-keys",
    workflow: WORKFLOW_OPENAI,
    ciScript: OPENAI_LAUNCH_SCRIPT,
  },
};

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
    requireAuth();
    requireConfig();
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

    // Step 2: Choose agent
    blank();
    const agent = await select<Agent>({
      message: "Which AI agent do you use in CI?",
      choices: [
        { name: "Claude Code", value: "claude-code" as const },
        { name: "Cursor", value: "cursor" as const },
        { name: "OpenAI Codex", value: "codex" as const },
      ],
    });
    const spec = AGENTS[agent];

    // Step 3: Write workflow file (and CI launch script if the agent uses an SDK)
    const workflowDir = join(process.cwd(), ".github", "workflows");
    const workflowPath = join(workflowDir, "buron.yml");

    if (!existsSync(workflowDir)) {
      mkdirSync(workflowDir, { recursive: true });
    }

    writeFileSync(workflowPath, spec.workflow, "utf-8");
    success("Workflow file created at .github/workflows/buron.yml");

    if (spec.ciScript) {
      const ciDir = join(process.cwd(), ".buron", "ci");
      const ciScriptPath = join(ciDir, "launch.ts");
      if (!existsSync(ciDir)) {
        mkdirSync(ciDir, { recursive: true });
      }
      writeFileSync(ciScriptPath, spec.ciScript, "utf-8");
      success("CI launch script created at .buron/ci/launch.ts");
    }

    // Step 4: Set the agent's API key as a GitHub secret
    blank();
    info(`Two GitHub secrets to set so the workflow can run:`);
    blank();

    if (ghAvailable) {
      // Buron token first — required for the CLI to authenticate without
      // running `buron login` (no interactive flow in CI).
      info(
        "BURON_TOKEN is your Buron account token. Find it in ~/Library/Application Support/com.buron.cli/auth.json (macOS), $XDG_CONFIG_HOME/com.buron.cli/auth.json (Linux), or %APPDATA%\\\\com.buron.cli\\\\auth.json (Windows) under the 'token' field.",
      );
      blank();

      const setBuron = await confirm({
        message: `Set ${bold("BURON_TOKEN")} now?`,
        default: true,
      });

      if (setBuron) {
        try {
          execFileSync("gh", ["secret", "set", "BURON_TOKEN"], { stdio: "inherit" });
          success("BURON_TOKEN secret set");
        } catch {
          warn("Failed to set BURON_TOKEN.");
          info(`Try again with: ${bold("gh secret set BURON_TOKEN")}`);
        }
      } else {
        info(`When you're ready, run: ${bold("gh secret set BURON_TOKEN")}`);
      }

      blank();

      const setProvider = await confirm({
        message: `Set ${bold(spec.apiKeyName)} now? (your ${spec.providerLabel} API key)`,
        default: true,
      });

      if (setProvider) {
        try {
          execFileSync("gh", ["secret", "set", spec.apiKeyName], { stdio: "inherit" });
          success(`${spec.apiKeyName} secret set`);
        } catch {
          warn(`Failed to set ${spec.apiKeyName}.`);
          info(`Try again with: ${bold(`gh secret set ${spec.apiKeyName}`)}`);
        }
      } else {
        info(`When you're ready, run: ${bold(`gh secret set ${spec.apiKeyName}`)}`);
      }
    } else {
      info("  BURON_TOKEN: <your Buron account token>");
      info(`  ${spec.apiKeyName}: <your ${spec.providerLabel} API key>`);
      if (spec.consoleUrl) {
        info(`  ${spec.providerLabel} keys at ${link(spec.consoleUrl)}`);
      }
    }

    // Step 5: Offer to commit
    blank();
    const filesToCommit = spec.ciScript
      ? ".github/workflows/buron.yml + .buron/ci/launch.ts"
      : ".github/workflows/buron.yml";

    const shouldCommit = await confirm({
      message: `Commit and push ${filesToCommit}?`,
      default: false,
    });

    if (shouldCommit) {
      try {
        execSync("git add .github/workflows/buron.yml", { stdio: "pipe" });
        if (spec.ciScript) {
          execSync("git add .buron/ci/launch.ts", { stdio: "pipe" });
        }
        execSync('git commit -m "Add Buron CI workflow"', { stdio: "pipe" });
        execSync("git push", { stdio: "pipe" });
        success("Workflow committed and pushed");
      } catch {
        warn("Failed to commit. Files are ready in your working tree.");
      }
    } else {
      info("Workflow files are ready to commit when you are.");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
