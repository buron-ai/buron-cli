import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { checkbox } from "@inquirer/prompts";
import { readAuth } from "../lib/auth.js";
import { readConfig, requireConfig } from "../lib/config.js";
import {
  getMcpUrl,
  installMcpServer,
  MCP_EDITOR_TARGETS,
  type McpEditorTarget,
} from "../lib/mcp.js";
import { blank, error, info, success, warn } from "../lib/ui.js";
import { linkCommand } from "./link.js";
import { loginCommand } from "./login.js";

/** The skills CLI's --agent ids for each of our editor targets. */
const SKILLS_AGENT_IDS: Record<McpEditorTarget, string> = {
  "claude-code": "claude-code",
  cursor: "cursor",
  copilot: "github-copilot",
  codex: "codex",
};

const SKILLS_SOURCE = "buron-ai/skills";

interface SetupOptions {
  yes?: boolean;
  agents?: string[];
}

/**
 * Setup is a concierge, not an installer: identity, then delegate. MCP
 * configs are written per each editor's own convention (lib/mcp.ts), and
 * skills are installed by the ecosystem's `skills` CLI, which knows every
 * agent's directory. Nothing here scaffolds project files — the /launch
 * skill creates what it needs on first run.
 */
export async function setupCommand(options: SetupOptions = {}): Promise<void> {
  try {
    const existingAuth = readAuth();
    if (existingAuth) {
      info(`Logged in as ${existingAuth.email}`);
    } else {
      blank();
      info("Step 1 of 3: log in to Buron");
      await loginCommand();
    }

    // Login auto-links inside a repo; this only fires when that was skipped
    // (not a repo at login time, or auto-link degraded to a hint).
    if (!readConfig()) {
      blank();
      info("Step 2 of 3: link this repo to a Buron team");
      await linkCommand();
    }
    const config = requireConfig();

    blank();
    info("Step 3 of 3: connect your editors");
    const targets = await selectTargets(options);
    if (targets.length === 0) {
      warn("No editors selected.");
      info("To connect one manually, add this MCP server URL to your editor:");
      info(getMcpUrl(config));
      return;
    }

    for (const target of targets) {
      const result = installMcpServer(target, config);
      const label = MCP_EDITOR_TARGETS.find((t) => t.id === target)?.label ?? target;
      info(`MCP for ${label}: ${result.path.replace(`${process.cwd()}/`, "")} (${result.action})`);
      if (target === "codex" && result.action !== "kept") {
        info("  Run `codex mcp login buron` to sign in");
      }
    }

    blank();
    info(`Installing Buron skills via \`npx skills add ${SKILLS_SOURCE}\` ...`);
    try {
      execFileSync(
        "npx",
        [
          "-y",
          "skills",
          "add",
          SKILLS_SOURCE,
          "-y",
          "--skill",
          "*",
          ...targets.flatMap((t) => ["-a", SKILLS_AGENT_IDS[t]]),
        ],
        { stdio: "inherit" },
      );
    } catch {
      warn("Skill install didn't finish. Run it yourself:");
      info(`  npx skills add ${SKILLS_SOURCE}`);
    }

    blank();
    success("Setup complete");
    info("Your editor will ask you to sign in to Buron the first time it connects.");
    info('Then try asking it: "What was my ad spend in the last 7 days?"');
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}

async function selectTargets(options: SetupOptions): Promise<McpEditorTarget[]> {
  const validIds = MCP_EDITOR_TARGETS.map((t) => t.id);

  if (options.agents?.length) {
    const picked = options.agents.filter((a): a is McpEditorTarget =>
      (validIds as readonly string[]).includes(a),
    );
    const unknown = options.agents.filter((a) => !(validIds as readonly string[]).includes(a));
    if (unknown.length > 0) {
      warn(`Unknown --agents ignored: ${unknown.join(", ")} (valid: ${validIds.join(", ")})`);
    }
    return picked;
  }

  const detected = MCP_EDITOR_TARGETS.filter((t) =>
    existsSync(join(process.cwd(), t.detectPath)),
  ).map((t) => t.id);

  if (options.yes) {
    // Non-interactive: detected editors, or all of them on a fresh repo.
    return detected.length > 0 ? detected : [...validIds];
  }

  return checkbox({
    message: "Which editors should Buron connect to?",
    choices: MCP_EDITOR_TARGETS.map((t) => ({
      name: t.label,
      value: t.id,
      checked: detected.length === 0 || detected.includes(t.id),
    })),
  });
}
