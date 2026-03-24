import { homedir } from "node:os";
import { join, resolve } from "node:path";

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
  return join(getProjectDir(cwd), "context.md");
}

export function getLaunchesDir(cwd?: string): string {
  return join(getProjectDir(cwd), "launches");
}

export function resolveFromCwd(...segments: string[]): string {
  return resolve(process.cwd(), ...segments);
}
