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
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function validateApiUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid BURON_API_URL: ${url}`);
  }
  if (parsed.protocol === "https:") return url;
  if (parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname)) return url;
  throw new Error(
    `BURON_API_URL must use https:// (got ${parsed.protocol}//${parsed.hostname}). Only http://localhost is permitted for local development.`,
  );
}

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
    throw new Error("Not linked. Run `buron link` first.");
  }
  return config;
}

export function getApiUrl(): string {
  const url = process.env.BURON_API_URL ?? readConfig()?.apiUrl ?? DEFAULT_API_URL;
  return validateApiUrl(url);
}
