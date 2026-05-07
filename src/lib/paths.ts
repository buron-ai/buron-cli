import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type SkillInstallTarget =
  | "agents"
  | "claude"
  | "copilot"
  | "cursor"
  | "codex";

export interface SkillInstallLocation {
  id: SkillInstallTarget;
  label: string;
  detectPath: string;
  skillsDir: string;
}

export function getUserDir(): string {
  return join(homedir(), ".buron");
}

export function getAuthPath(): string {
  return join(getUserDir(), "auth.json");
}

export function getProjectDir(cwd?: string): string {
  return join(cwd ?? process.cwd(), ".buron");
}

export function getConfigPath(cwd?: string): string {
  return join(getProjectDir(cwd), "config.json");
}

export function getContextPath(cwd?: string): string {
  return join(getProjectDir(cwd), "product-context.md");
}

export function getLaunchesDir(cwd?: string): string {
  return join(getProjectDir(cwd), "launches");
}

export function resolveFromCwd(...segments: string[]): string {
  return resolve(process.cwd(), ...segments);
}

export function getSkillInstallLocations(cwd?: string): SkillInstallLocation[] {
  const root = cwd ?? process.cwd();

  return [
    {
      id: "cursor",
      label: "Cursor",
      detectPath: join(root, ".cursor"),
      skillsDir: join(root, ".cursor", "skills"),
    },
    {
      id: "claude",
      label: "Claude Code",
      detectPath: join(root, ".claude"),
      skillsDir: join(root, ".claude", "skills"),
    },
    {
      id: "copilot",
      label: "GitHub Copilot",
      detectPath: join(root, ".github"),
      skillsDir: join(root, ".github", "skills"),
    },
    {
      id: "codex",
      label: "OpenAI Codex",
      detectPath: join(root, ".codex"),
      skillsDir: join(root, ".codex", "skills"),
    },
    {
      id: "agents",
      label: "Generic agents",
      detectPath: join(root, ".agents"),
      skillsDir: join(root, ".agents", "skills"),
    },
  ];
}

export interface BuronSkill {
  name: string;
  template: string;
}

export function getSkillPath(location: SkillInstallLocation, skillName: string): string {
  return join(location.skillsDir, skillName);
}
