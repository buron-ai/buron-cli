import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { checkbox, confirm } from "@inquirer/prompts";
import { readAuth } from "../lib/auth.js";
import { readConfig, requireConfig } from "../lib/config.js";
import {
  getMcpConfigPath,
  getMcpTargetLabel,
  getMcpUrl,
  installMcpServer,
  MCP_SUPPORTED_TARGETS,
} from "../lib/mcp.js";
import {
  getContextPath,
  getLaunchesDir,
  getProjectDir,
  getSkillInstallLocations,
  getSourcesDir,
  type SkillInstallLocation,
  type SourceEnv,
} from "../lib/paths.js";
import { installSkills, SKILLS } from "../lib/skills.js";
import { blank, error, info, success, warn } from "../lib/ui.js";
import { PRODUCT_CONTEXT_TEMPLATE } from "../templates/context.js";
import { linkCommand } from "./link.js";
import { loginCommand } from "./login.js";

export async function setupCommand(): Promise<void> {
  try {
    const existingAuth = readAuth();
    if (!existingAuth) {
      blank();
      info("Step 1 of 4: log in to Buron");
      await loginCommand();
    } else {
      info(`Using existing login for ${existingAuth.email}`);
    }

    const config = readConfig();
    if (!config) {
      blank();
      info("Step 2 of 4: link this repo to a Buron team");
      await linkCommand();
    } else {
      info(`Using existing link for ${config.orgName} / ${config.teamName}`);
    }

    blank();
    info("Step 3 of 4: create Buron project files");

    const projectDir = getProjectDir();
    const contextPath = getContextPath();
    const launchesDir = getLaunchesDir();

    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
      success("Created .buron/");
    }

    // Sources directory mirrors buron's /wiki/sources/<env>/ — the /launch
    // SKILL writes here before pushing via `buron file write`. Each editor /
    // CI environment gets its own subdirectory so files don't collide and
    // it's obvious where a source came from.
    const SOURCE_ENVS: SourceEnv[] = ["cursor", "claude-code", "copilot", "codex", "ci", "agents"];
    for (const env of SOURCE_ENVS) {
      const dir = getSourcesDir(env);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
    success("Created .buron/sources/{cursor,claude-code,copilot,codex,ci,agents}/");

    // Keep launches/ as a working area for engineer-edited drafts (rare path);
    // curator-written launches land in buron, not locally.
    if (!existsSync(launchesDir)) {
      mkdirSync(launchesDir, { recursive: true });
      success("Created .buron/launches/");
    }

    if (existsSync(contextPath)) {
      info("product-context.md already exists, skipping");
    } else {
      writeFileSync(contextPath, PRODUCT_CONTEXT_TEMPLATE, "utf-8");
      success("Created .buron/product-context.md");
    }

    blank();
    info("Step 4 of 5: install Buron skills for your editors");

    const selectedTargets = await selectInstallLocations();
    if (selectedTargets.length === 0) {
      warn("No editor folders selected, skipping skill install");
    } else {
      for (const location of selectedTargets) {
        installEditorSupport(location);
      }
      success(
        `Installed ${SKILLS.length} skills for ${selectedTargets
          .map((target) => target.label)
          .join(", ")}`,
      );
    }

    blank();
    info("Step 5 of 5: connect the Buron MCP server");

    const linkedConfig = requireConfig();
    const mcpTargets = selectedTargets
      .map((t) => t.id)
      .filter((id) => MCP_SUPPORTED_TARGETS.includes(id));

    if (mcpTargets.length === 0) {
      info("No MCP-compatible editors selected, skipping");
      info(`To connect manually, add this URL to your editor's MCP settings:`);
      info(getMcpUrl(linkedConfig));
    } else {
      const addMcp = await confirm({
        message: "Add the Buron MCP server to your editor?",
        default: true,
      });

      if (addMcp) {
        const installed: string[] = [];
        for (const target of mcpTargets) {
          if (installMcpServer(target, linkedConfig)) {
            const mcpPath = getMcpConfigPath(target);
            installed.push(getMcpTargetLabel(target));
            if (mcpPath) {
              info(`  → ${mcpPath.path.replace(`${process.cwd()}/`, "")}`);
            }
          }
        }
        if (installed.length > 0) {
          success(`MCP server added for ${installed.join(", ")}`);
          info("Your editor will ask you to sign in the first time it connects");
        }
      } else {
        info("Skipped. To connect later, add this URL to your editor's MCP settings:");
        info(getMcpUrl(linkedConfig));
      }
    }

    blank();
    success("Setup complete");
    if (existsSync(contextPath)) {
      info("Next, run `/launch` or `/setup-google-ads-tracking` in your editor");
    } else {
      info("Before your first launch, fill in `.buron/product-context.md`");
      info("Then run `/launch` or `/setup-google-ads-tracking` in your editor");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}

async function selectInstallLocations(): Promise<SkillInstallLocation[]> {
  const locations = getSkillInstallLocations();
  const hasDetectedTargets = locations.some((location) => existsSync(location.detectPath));

  const selectedIds = await checkbox({
    message: "Which editors should Buron install into for this project?",
    choices: locations.map((location) => ({
      name: `${location.label} (${location.skillsDir.replace(`${process.cwd()}/`, "")})`,
      value: location.id,
      checked: hasDetectedTargets && existsSync(location.detectPath),
    })),
  });

  return locations.filter((location) => selectedIds.includes(location.id));
}

function installEditorSupport(location: SkillInstallLocation) {
  installSkills(location);
}
