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
  path: string;
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
