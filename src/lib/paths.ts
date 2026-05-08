import { homedir } from "node:os";
import { join } from "node:path";

export type SkillInstallTarget = "agents" | "claude" | "copilot" | "cursor" | "codex";

export interface SkillInstallLocation {
  id: SkillInstallTarget;
  label: string;
  detectPath: string;
  path: string;
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

export function getSkillInstallLocations(): SkillInstallLocation[] {
  const root = process.cwd();

  return [
    {
      id: "cursor",
      label: "Cursor",
      detectPath: join(root, ".cursor"),
      path: join(root, ".cursor", "skills", "launch"),
    },
    {
      id: "claude",
      label: "Claude Code",
      detectPath: join(root, ".claude"),
      path: join(root, ".claude", "skills", "launch"),
    },
    {
      id: "copilot",
      label: "GitHub Copilot",
      detectPath: join(root, ".github"),
      path: join(root, ".github", "skills", "launch"),
    },
    {
      id: "codex",
      label: "OpenAI Codex",
      detectPath: join(root, ".codex"),
      path: join(root, ".codex", "skills", "launch"),
    },
    {
      id: "agents",
      label: "Generic agents",
      detectPath: join(root, ".agents"),
      path: join(root, ".agents", "skills", "launch"),
    },
  ];
}
