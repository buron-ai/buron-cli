import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { api } from "../lib/api.js";
import { getContextPath, getLaunchesDir } from "../lib/paths.js";
import { blank, error, info, link, spinner, success } from "../lib/ui.js";

function findLatestLaunch(launchesDir: string): string | null {
  if (!existsSync(launchesDir)) return null;

  const files = readdirSync(launchesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => ({
      name: f,
      path: join(launchesDir, f),
      mtime: statSync(join(launchesDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) return null;
  return files[0].path;
}

export async function pushCommand(): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();

    const contextPath = getContextPath();
    if (!existsSync(contextPath)) {
      error("No context.md found. Run `buron setup` first.");
      process.exit(1);
    }

    const context = readFileSync(contextPath, "utf-8");
    const launchesDir = getLaunchesDir();
    const latestLaunchPath = findLatestLaunch(launchesDir);

    let launch: string | null = null;
    if (latestLaunchPath) {
      launch = readFileSync(latestLaunchPath, "utf-8");
    }

    const s = spinner("Pushing to Buron...");
    s.start();

    const result = await api.push(config.orgId, config.teamId, context, launch, auth.token);
    s.stop();

    blank();
    success("Pushed to Buron. Assets generating...");

    if (latestLaunchPath) {
      info(`Launch file: ${latestLaunchPath.split("/").at(-1)}`);
    } else {
      info("No launch file found — pushed context only.");
    }

    info(`Dashboard: ${link(result.dashboardUrl)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
