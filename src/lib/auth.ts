import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAuthPath, getUserDir } from "./paths.js";

export interface AuthData {
  token: string;
  email: string;
}

export function readAuth(): AuthData | null {
  const authPath = getAuthPath();

  if (!existsSync(authPath)) {
    return null;
  }

  try {
    const raw = readFileSync(authPath, "utf-8");
    const data = JSON.parse(raw) as AuthData;

    if (!data.token || !data.email) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

export function writeAuth(data: AuthData): void {
  const authPath = getAuthPath();
  const dir = dirname(authPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(authPath, JSON.stringify(data, null, 2), "utf-8");
}

export function clearAuth(): void {
  const authPath = getAuthPath();

  if (existsSync(authPath)) {
    rmSync(authPath);
  }

  const userDir = getUserDir();
  try {
    rmSync(userDir, { recursive: true });
  } catch {
    // ignore if dir has other files
  }
}

export function requireAuth(): AuthData {
  const auth = readAuth();
  if (!auth) {
    throw new Error("Not logged in. Run `buron login` first.");
  }
  return auth;
}
