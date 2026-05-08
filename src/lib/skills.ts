import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BURON_SKILL_TEMPLATE } from "../templates/skill.js";
import { getSkillInstallLocations } from "./paths.js";

const SKILL_URL = "https://raw.githubusercontent.com/buron-ai/buron-cli/main/skills/launch.md";
const FETCH_TIMEOUT_MS = 2_000;

export function getBundledSkill(): string {
  return BURON_SKILL_TEMPLATE;
}

export async function fetchLatestSkill(): Promise<string | null> {
  if (process.env.BURON_NO_SKILL_REFRESH === "1") return null;
  if (process.env.BURON_MOCK === "1") return null;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(SKILL_URL, {
      signal: ctrl.signal,
      headers: { "User-Agent": `buron-cli/${process.env.BURON_VERSION ?? "dev"}` },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function shortHash(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

export interface RefreshResult {
  updated: { label: string; path: string }[];
  customized: { label: string; path: string }[];
  upToDate: number;
}

/**
 * Compare local SKILL.md files in installed editor folders against `latest`.
 * - If a local file matches the bundled (CLI-shipped) version, the user hasn't
 *   customized it: overwrite it with `latest`.
 * - If a local file differs from the bundled version, the user has edited it:
 *   leave it alone and report it back so the caller can warn.
 */
export function refreshInstalledSkills(latest: string): RefreshResult {
  const bundled = getBundledSkill();
  const bundledHash = shortHash(bundled);
  const latestHash = shortHash(latest);

  const result: RefreshResult = { updated: [], customized: [], upToDate: 0 };

  if (latestHash === bundledHash) return result;

  for (const location of getSkillInstallLocations()) {
    const skillPath = join(location.path, "SKILL.md");
    if (!existsSync(skillPath)) continue;

    const local = readFileSync(skillPath, "utf-8");
    const localHash = shortHash(local);

    if (localHash === latestHash) {
      result.upToDate += 1;
      continue;
    }

    if (localHash === bundledHash) {
      writeFileSync(skillPath, latest, "utf-8");
      result.updated.push({ label: location.label, path: skillPath });
    } else {
      result.customized.push({ label: location.label, path: skillPath });
    }
  }

  return result;
}
