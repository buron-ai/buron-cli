import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getConfigPath } from "./paths.js";

export interface ProjectConfig {
  orgId: string;
  orgName: string;
  teamId: string;
  teamName: string;
  apiUrl: string;
}

const DEFAULT_API_URL = "https://app.buron.ai";

export function readConfig(): ProjectConfig | null {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    return JSON.parse(raw) as ProjectConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: ProjectConfig): void {
  const configPath = getConfigPath();
  const dir = dirname(configPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

export function requireConfig(): ProjectConfig {
  const config = readConfig();
  if (!config) {
    throw new Error("Not linked. Run `buron link` first");
  }
  return config;
}

export function getApiUrl(): string {
  return process.env.BURON_API_URL ?? readConfig()?.apiUrl ?? DEFAULT_API_URL;
}
