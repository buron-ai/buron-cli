import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { confirm, select } from "@inquirer/prompts";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { getRepoName } from "../lib/git.js";
import { blank, bold, dim, error, info, link, success, warn } from "../lib/ui.js";
import { CURSOR_LAUNCH_SCRIPT } from "../templates/cursor-launch-script.js";
import { OPENAI_LAUNCH_SCRIPT } from "../templates/openai-launch-script.js";
import { WORKFLOW_CLAUDE } from "../templates/workflow-claude.js";
import { WORKFLOW_CURSOR } from "../templates/workflow-cursor.js";
import { WORKFLOW_OPENAI } from "../templates/workflow-openai.js";

type Agent = "claude" | "cursor" | "openai";

interface AgentSpec {
  label: string;
  apiKeyName: string;
  providerLabel: string;
  consoleUrl: string | null;
  workflow: string;
  ciScript: string | null;
}

const AGENTS: Record<Agent, AgentSpec> = {
  claude: {
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
  openai: {
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
        { name: "Claude Code", value: "claude" },
        { name: "Cursor", value: "cursor" },
        { name: "OpenAI Codex", value: "openai" },
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
    console.log(bold("One secret needed"));
    console.log(dim(`This workflow runs ${spec.label} in GitHub Actions to author launch files`));
    console.log(
      dim(`when you open a PR. To do that, ${spec.label} needs your ${spec.providerLabel}`),
    );
    console.log(dim(`API key, stored as a GitHub secret called ${spec.apiKeyName}.`));
    blank();
    console.log(dim("Buron never sees this key — it goes from you straight to GitHub."));
    if (spec.consoleUrl) {
      console.log(dim(`Get a key at ${link(spec.consoleUrl)}`));
    }
    blank();

    if (ghAvailable) {
      const setNow = await confirm({
        message: `Set ${spec.apiKeyName} now? (gh will prompt you for the value)`,
        default: true,
      });

      if (setNow) {
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
      info(`Set ${spec.apiKeyName} manually in your repository's secrets:`);
      if (repoName) {
        info(`  ${link(`https://github.com/${repoName}/settings/secrets/actions`)}`);
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
