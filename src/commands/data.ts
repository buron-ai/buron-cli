import { api, type SemanticQuery } from "../lib/api.js";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { blank, error, info, success } from "../lib/ui.js";

function fail(message: string): never {
  blank();
  error(message);
  process.exit(1);
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

/** Read a --spec value: a JSON string, a file path, or `-` for stdin. */
async function readSpec(value: string): Promise<SemanticQuery> {
  let raw = value;
  if (value === "-") {
    raw = await readStdin();
  } else if (!value.trim().startsWith("{")) {
    const { readFile } = await import("node:fs/promises");
    raw = await readFile(value, "utf8");
  }
  try {
    return JSON.parse(raw) as SemanticQuery;
  } catch {
    return fail("--spec must be a JSON object, a path to one, or - for stdin");
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function splitList(value?: string): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse repeatable `-f field:op:value` (value comma-split for one_of). */
function parseFilters(raw?: string[]): SemanticQuery["filters"] {
  if (!raw || raw.length === 0) return undefined;
  return raw.map((item) => {
    const first = item.indexOf(":");
    const second = item.indexOf(":", first + 1);
    if (first === -1 || second === -1) {
      fail(`Bad filter "${item}". Use field:op:value (e.g. device:equals:MOBILE)`);
    }
    const field = item.slice(0, first);
    const op = item.slice(first + 1, second);
    const values = item
      .slice(second + 1)
      .split(",")
      .map((v) => v.trim());
    return { field, op, value: values.length > 1 ? values : values[0] };
  });
}

/** Parse repeatable `--sort field:dir`. */
function parseSort(raw?: string[]): SemanticQuery["orderBy"] {
  if (!raw || raw.length === 0) return undefined;
  return raw.map((item) => {
    const [field, dir] = item.split(":");
    return { field, dir: dir === "desc" ? "desc" : "asc" };
  });
}

/** Render a wire QueryResult ({columns, rows} or {notReady}/{error}) as text. */
function printResult(result: unknown): void {
  const r = result as {
    columns?: Array<{ label: string }>;
    rows?: unknown[][];
    rowCount?: number;
    truncated?: boolean;
    notReady?: { reason: string; action: string };
    error?: { message: string; suggestions?: string[] };
  };
  if (r.error) {
    const hint = r.error.suggestions?.length ? `\n  try: ${r.error.suggestions.join(", ")}` : "";
    fail(`${r.error.message}${hint}`);
  }
  if (r.notReady) {
    blank();
    info(`Not ready (${r.notReady.reason}): ${r.notReady.action}`);
    return;
  }
  if (!(r.columns && r.rows)) {
    printJson(result);
    return;
  }
  const rows = r.rows;
  const header = r.columns.map((c) => c.label);
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => String(row[i] ?? "").length)),
  );
  const line = (cells: unknown[]) =>
    cells.map((c, i) => String(c ?? "").padEnd(widths[i])).join("  ");
  blank();
  process.stdout.write(`${line(header)}\n`);
  for (const row of rows) process.stdout.write(`${line(row)}\n`);
  blank();
  const note = r.truncated ? " (truncated — narrow the range or lower the limit)" : "";
  info(`${r.rowCount ?? rows.length} rows${note}`);
}

// ── datasets list ───────────────────────────────────────────────────

export async function datasetsListCommand(options: { json?: boolean }): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const { datasets } = await api.data.listDatasets(config.orgId, config.teamId, auth.token);
    if (options.json) {
      printJson(datasets);
      return;
    }
    if (datasets.length === 0) {
      blank();
      info("No datasets");
      return;
    }
    blank();
    for (const d of datasets) {
      const tier = d.live ? "live" : "warehouse";
      const avail = d.availability.available
        ? "ready"
        : `unavailable — ${d.availability.reason ?? "not ready"}`;
      process.stdout.write(
        `${d.id.padEnd(28)} ${d.family.padEnd(14)} ${tier.padEnd(10)} ${avail}\n`,
      );
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── datasets describe ───────────────────────────────────────────────

export async function datasetsDescribeCommand(id: string): Promise<void> {
  try {
    const auth = requireAuth();
    const result = await api.data.describeDataset(id, auth.token);
    printJson(result);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── datasets query ──────────────────────────────────────────────────

export async function datasetsQueryCommand(
  id: string,
  options: {
    measures?: string;
    dimensions?: string;
    filter?: string[];
    from?: string;
    to?: string;
    granularity?: string;
    sort?: string[];
    limit?: string;
    spec?: string;
    json?: boolean;
  },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const query: SemanticQuery = options.spec
      ? await readSpec(options.spec)
      : {
          measures: splitList(options.measures),
          dimensions: splitList(options.dimensions),
          filters: parseFilters(options.filter),
          dateRange:
            options.from && options.to
              ? { from: options.from, to: options.to, granularity: options.granularity }
              : undefined,
          orderBy: parseSort(options.sort),
          limit: options.limit ? Number(options.limit) : undefined,
        };
    const result = await api.data.queryDataset(config.orgId, config.teamId, id, query, auth.token);
    if (options.json) {
      printJson(result);
      return;
    }
    printResult(result);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── sql (warehouse escape hatch) ────────────────────────────────────

export async function sqlCommand(sql: string, options: { json?: boolean }): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.warehouseSql(config.orgId, config.teamId, sql, auth.token);
    if (options.json) {
      printJson(result);
      return;
    }
    printResult(result);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── queries list ────────────────────────────────────────────────────

export async function queriesListCommand(options: {
  dataset?: string;
  json?: boolean;
}): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const { queries } = await api.data.listQueries(
      config.orgId,
      config.teamId,
      auth.token,
      options.dataset,
    );
    if (options.json) {
      printJson(queries);
      return;
    }
    if (queries.length === 0) {
      blank();
      info("No saved queries");
      return;
    }
    for (const q of queries) {
      process.stdout.write(`${q.id}  ${(q.dataset ?? q.kind).padEnd(24)}  ${q.name}\n`);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── queries create ──────────────────────────────────────────────────

export async function queriesCreateCommand(
  name: string,
  options: { spec: string; chart?: string },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const query = await readSpec(options.spec);
    const viz = options.chart ? { chart: options.chart } : undefined;
    const result = await api.data.createQuery(
      config.orgId,
      config.teamId,
      name,
      query,
      auth.token,
      viz,
    );
    const created = result as { id?: string; name?: string; error?: { message: string } };
    if (created.error) fail(created.error.message);
    blank();
    success(`Created query: ${created.name} (${created.id})`);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── queries run ─────────────────────────────────────────────────────

export async function queriesRunCommand(id: string, options: { json?: boolean }): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.runQuery(config.orgId, config.teamId, id, auth.token);
    if (options.json) {
      printJson(result);
      return;
    }
    printResult(result);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── dashboards list ─────────────────────────────────────────────────

export async function dashboardsListCommand(options: { json?: boolean }): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.data.listDashboards(config.orgId, config.teamId, auth.token);
    if (options.json) {
      printJson(result.dashboards);
      return;
    }
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
    printJson(result);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── dashboards add ──────────────────────────────────────────────────

export async function dashboardsAddCommand(dashboardId: string, queryId: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    await api.data.addDashboardPanel(config.orgId, config.teamId, dashboardId, queryId, auth.token);
    blank();
    success(`Added query ${queryId} to dashboard ${dashboardId}`);
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
    printJson(result);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}
