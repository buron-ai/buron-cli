import { existsSync } from "node:fs";
import { readConfig } from "../lib/config.js";
import { getSkillInstallLocations } from "../lib/paths.js";
import { installSkills, SKILLS } from "../lib/skills.js";
import { blank, error, info, success, warn } from "../lib/ui.js";

export async function skillsUpdateCommand(): Promise<void> {
  try {
    const config = readConfig();
    if (!config) {
      blank();
      error("Not linked. Run `buron setup` first");
      process.exit(1);
    }

    const locations = getSkillInstallLocations();
    const detected = locations.filter((location) => existsSync(location.detectPath));

    if (detected.length === 0) {
      blank();
      warn("No editor folders detected (.claude, .cursor, .github, .codex, .agents)");
      info("Run `buron setup` to pick which editors to install into");
      return;
    }

    blank();
    info(`Updating ${SKILLS.length} skills in ${detected.length} editor folder(s)...`);

    for (const location of detected) {
      installSkills(location);
      success(`  ${location.label}`);
    }

    blank();
    success(`Updated: ${SKILLS.map((s) => s.name).join(", ")}`);
    info("Restart your Claude Code or Cursor session for changes to take effect");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
