import { fetchLatestSkill, refreshInstalledSkills } from "../lib/skills.js";
import { blank, error, info, success, warn } from "../lib/ui.js";

export async function syncCommand(): Promise<void> {
  try {
    info("Checking for skill updates...");
    const latest = await fetchLatestSkill();
    if (!latest) {
      blank();
      warn("Could not fetch the latest skill. You're still running the bundled copy.");
      info("Set BURON_NO_SKILL_REFRESH=1 to silence skill update checks.");
      return;
    }

    const result = refreshInstalledSkills(latest);
    blank();

    if (result.updated.length === 0 && result.customized.length === 0) {
      success(
        result.upToDate > 0
          ? `All ${result.upToDate} installed skill file(s) already up to date.`
          : "No installed skill files found. Run `buron setup` to install for an editor.",
      );
      return;
    }

    for (const u of result.updated) {
      success(`Updated ${u.label} (${u.path})`);
    }
    for (const c of result.customized) {
      warn(`${c.label} has local changes — not overwriting (${c.path})`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
