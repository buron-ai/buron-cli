import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { getAuthPath, getUserDir } from "./paths.js";

export interface AuthData {
  token: string;
  email: string;
}

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}

export function readAuth(): AuthData | null {
  // CI / non-interactive environments: BURON_TOKEN takes precedence over
  // any on-disk auth file. Lets workflows authenticate without the
  // interactive `buron login` flow that writes auth.json. The email is
  // surfaced for display only — set BURON_EMAIL alongside if you want a
  // friendlier identifier in logs; otherwise it falls back to a marker.
  const envToken = process.env.BURON_TOKEN;
  if (envToken) {
    return { token: envToken, email: process.env.BURON_EMAIL ?? "ci-runner" };
  }

  const authPath = getAuthPath();

  let raw: string;
  try {
    raw = readFileSync(authPath, "utf-8");
  } catch (err) {
    if (isErrnoException(err) && err.code === "ENOENT") {
      return null;
    }
    if (isErrnoException(err) && (err.code === "EACCES" || err.code === "EPERM")) {
      throw new Error(`Can't read auth file (${err.code}): ${authPath}`);
    }
    throw err;
  }

  let data: AuthData;
  try {
    data = JSON.parse(raw) as AuthData;
  } catch {
    throw new Error(
      `Auth file can't be read: ${authPath}. Run \`buron logout\` then \`buron login\``,
    );
  }

  if (!data.token || !data.email) {
    throw new Error(
      `Auth file is incomplete: ${authPath}. Run \`buron logout\` then \`buron login\``,
    );
  }

  return data;
}

export function writeAuth(data: AuthData): void {
  const authPath = getAuthPath();
  const dir = dirname(authPath);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }

  // Atomic write: tmp + rename. Prevents a partial file from being left behind
  // on crash or power loss, which would lock the user out.
  const tmpPath = `${authPath}.tmp.${process.pid}`;
  try {
    writeFileSync(tmpPath, JSON.stringify(data, null, 2), {
      encoding: "utf-8",
      mode: 0o600,
    });
    renameSync(tmpPath, authPath);
  } catch (err) {
    if (existsSync(tmpPath)) {
      try {
        rmSync(tmpPath);
      } catch {}
    }
    if (isErrnoException(err) && (err.code === "EACCES" || err.code === "EPERM")) {
      throw new Error(`Can't write auth file (${err.code}): ${authPath}`);
    }
    throw err;
  }
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
    throw new Error("Not logged in. Run `buron login` first");
  }
  return auth;
}
