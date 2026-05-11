import { api } from "../lib/api.js";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { blank, error, info, success } from "../lib/ui.js";

function fail(message: string): never {
  blank();
  error(message);
  process.exit(1);
}

// ── query ───────────────────────────────────────────────────────────

export async function queryCommand(
  queryString: string,
  options: {
    source: string;
    from?: string;
    to?: string;
  },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();

    const dateRange = options.from && options.to ? { from: options.from, to: options.to } : undefined;

    const result = await api.data.query(
      config.orgId,
      config.teamId,
      options.source,
      queryString,
      auth.token,
      dateRange,
    );
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write("\n");
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── queries list ────────────────────────────────────────────────────

export async function queriesListCommand(options: { source?: string }): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.listQueries(config.orgId, config.teamId, auth.token, options.source);
    if (result.queries.length === 0) {
      blank();
      info("No saved queries");
      return;
    }
    for (const q of result.queries) {
      process.stdout.write(`${q.id}  ${q.source}  ${q.name}\n`);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── queries create ──────────────────────────────────────────────────

export async function queriesCreateCommand(
  name: string,
  options: { source: string; query: string; config?: string },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const parsedConfig = options.config ? JSON.parse(options.config) as Record<string, unknown> : undefined;
    const result = await api.data.createQuery(
      config.orgId,
      config.teamId,
      name,
      options.source,
      options.query,
      auth.token,
      parsedConfig,
    );
    blank();
    success(`Created query: ${result.name} (${result.id})`);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── queries run ─────────────────────────────────────────────────────

export async function queriesRunCommand(id: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.runQuery(config.orgId, config.teamId, id, auth.token);
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write("\n");
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── dashboards list ─────────────────────────────────────────────────

export async function dashboardsListCommand(): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.listDashboards(config.orgId, config.teamId, auth.token);
    if (result.dashboards.length === 0) {
      blank();
      info("No dashboards");
      return;
    }
    for (const d of result.dashboards) {
      const desc = d.description ? `  ${d.description}` : "";
      process.stdout.write(`${d.id}  ${d.title ?? "(untitled)"}${desc}\n`);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── dashboards run ──────────────────────────────────────────────────

export async function dashboardsRunCommand(
  id: string,
  options: { from: string; to: string; fresh?: boolean },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.runDashboard(
      config.orgId,
      config.teamId,
      id,
      options.from,
      options.to,
      auth.token,
      options.fresh,
    );
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write("\n");
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── integration ─────────────────────────────────────────────────────

export async function integrationCommand(provider: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.getIntegration(config.orgId, config.teamId, provider, auth.token);
    process.stdout.write(JSON.stringify(result, null, 2));
    process.stdout.write("\n");
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}
