import { homedir } from "node:os";
import { join, resolve } from "node:path";

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

export function resolveFromCwd(...segments: string[]): string {
  return resolve(process.cwd(), ...segments);
}
