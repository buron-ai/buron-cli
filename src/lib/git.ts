import { execSync } from "node:child_process";

export function isGitRepo(): boolean {
  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function getRemoteUrl(): string | null {
  try {
    const url = execSync("git remote get-url origin", { stdio: "pipe", encoding: "utf-8" }).trim();
    return url || null;
  } catch {
    return null;
  }
}

export function getRepoName(): string | null {
  const url = getRemoteUrl();
  if (!url) return null;

  // Handle SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[1];

  // Handle HTTPS: https://github.com/owner/repo.git
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "");
    return path || null;
  } catch {
    return null;
  }
}

export function getCurrentBranch(): string | null {
  try {
    return execSync("git branch --show-current", { stdio: "pipe", encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}
