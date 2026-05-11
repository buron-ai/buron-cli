import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { checkbox } from "@inquirer/prompts";
import { readAuth } from "../lib/auth.js";
import { readConfig } from "../lib/config.js";
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
    info("Step 4 of 4: install Buron skills for your editors");

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
