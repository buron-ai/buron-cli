import { homedir } from "node:os";
import { join, resolve } from "node:path";

export type SkillInstallTarget = "agents" | "claude-code" | "copilot" | "cursor" | "codex";

// Where a source-kind=launch file gets filed in buron's library.
// "ci" is added on top of the editor targets — it's an env source, not an
// install target.
export type SourceEnv = SkillInstallTarget | "ci";

export interface SkillInstallLocation {
  id: SkillInstallTarget;
  label: string;
  detectPath: string;
  skillsDir: string;
}

const APP_NAME = "com.buron.cli";

export function getUserDir(): string {
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", APP_NAME);
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA ?? join(homedir(), "AppData", "Roaming");
    return join(appData, APP_NAME);
  }
  const xdgConfigHome = process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
  return join(xdgConfigHome, APP_NAME);
}

export function getAuthPath(): string {
  return join(getUserDir(), "auth.json");
}

export function getProjectDir(): string {
  return join(process.cwd(), ".buron");
}

export function getConfigPath(): string {
  return join(getProjectDir(), "config.json");
}

export function getContextPath(): string {
  return join(getProjectDir(), "product-context.md");
}

export function getLaunchesDir(): string {
  return join(getProjectDir(), "launches");
}

// Local working directory for source files staged before pushing to buron.
// Mirrors the destination shape: .buron/sources/<env>/ ↔ /wiki/sources/<env>/.
export function getSourcesDir(env: SourceEnv): string {
  return join(getProjectDir(), "sources", env);
}

export function resolveFromCwd(...segments: string[]): string {
  return resolve(process.cwd(), ...segments);
}

export function getSkillInstallLocations(): SkillInstallLocation[] {
  const root = process.cwd();

  return [
    {
      id: "cursor",
      label: "Cursor",
      detectPath: join(root, ".cursor"),
      skillsDir: join(root, ".cursor", "skills"),
    },
    {
      id: "claude-code",
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
