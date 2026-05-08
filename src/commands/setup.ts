import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkbox } from "@inquirer/prompts";
import { readAuth } from "../lib/auth.js";
import { readConfig } from "../lib/config.js";
import {
  getContextPath,
  getLaunchesDir,
  getProjectDir,
  getSkillInstallLocations,
  type SkillInstallLocation,
} from "../lib/paths.js";
import { blank, error, info, success, warn } from "../lib/ui.js";
import { PRODUCT_CONTEXT_TEMPLATE } from "../templates/context.js";
import { BURON_SKILL_TEMPLATE } from "../templates/skill.js";
import { linkCommand } from "./link.js";
import { loginCommand } from "./login.js";

export async function setupCommand(): Promise<void> {
  try {
    const existingAuth = readAuth();
    if (!existingAuth) {
      blank();
      info("Step 1 of 4: Log in to Buron");
      await loginCommand();
    } else {
      info(`Using existing login for ${existingAuth.email}`);
    }

    const config = readConfig();
    if (!config) {
      blank();
      info("Step 2 of 4: Link this repo to a Buron team");
      await linkCommand();
    } else {
      info(`Using existing link for ${config.orgName} / ${config.teamName}`);
    }

    blank();
    info("Step 3 of 4: Set up Buron project files");

    const projectDir = getProjectDir();
    const contextPath = getContextPath();
    const launchesDir = getLaunchesDir();

    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
      success("Created .buron/");
    }

    if (!existsSync(launchesDir)) {
      mkdirSync(launchesDir, { recursive: true });
      success("Created .buron/launches/");
    }

    if (existsSync(contextPath)) {
      info("product-context.md already exists, skipping.");
    } else {
      writeFileSync(contextPath, PRODUCT_CONTEXT_TEMPLATE, "utf-8");
      success("Created .buron/product-context.md");
    }

    blank();
    info("Step 4 of 4: Install Buron for your editors");

    const selectedTargets = await selectInstallLocations();
    if (selectedTargets.length === 0) {
      warn("No editor folders selected. Skipping skill installation.");
    } else {
      for (const location of selectedTargets) {
        installEditorSupport(location);
      }
      success(`Installed Buron for ${selectedTargets.map((target) => target.label).join(", ")}`);
    }

    blank();
    success("Setup complete.");
    if (existsSync(contextPath)) {
      info("Next, run `/launch` in your editor.");
    } else {
      info("Before your first launch, fill `.buron/product-context.md`.");
      info("Then run `/launch` in your editor.");
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
      name: `${location.label} (${location.path.replace(`${process.cwd()}/`, "")})`,
      value: location.id,
      checked: hasDetectedTargets && existsSync(location.detectPath),
    })),
  });

  return locations.filter((location) => selectedIds.includes(location.id));
}

function installEditorSupport(location: SkillInstallLocation) {
  mkdirSync(location.path, { recursive: true });
  writeFileSync(join(location.path, "SKILL.md"), BURON_SKILL_TEMPLATE, "utf-8");
}
