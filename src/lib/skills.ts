import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import AUTOMATE_LAUNCH_SKILL_TEMPLATE from "../templates/automate-launch.md";
import LAUNCH_SKILL_TEMPLATE from "../templates/launch.md";
import SETUP_GOOGLE_ADS_TRACKING_SKILL_TEMPLATE from "../templates/setup-google-ads-tracking.md";
import { type BuronSkill, getSkillPath, type SkillInstallLocation } from "./paths.js";

export const SKILLS: BuronSkill[] = [
  { name: "launch", template: LAUNCH_SKILL_TEMPLATE },
  {
    name: "setup-google-ads-tracking",
    template: SETUP_GOOGLE_ADS_TRACKING_SKILL_TEMPLATE,
  },
  {
    name: "automate-launch",
    template: AUTOMATE_LAUNCH_SKILL_TEMPLATE,
  },
];

export function installSkills(location: SkillInstallLocation): void {
  for (const skill of SKILLS) {
    const skillPath = getSkillPath(location, skill.name);
    mkdirSync(skillPath, { recursive: true });
    writeFileSync(join(skillPath, "SKILL.md"), skill.template, "utf-8");
  }
}
