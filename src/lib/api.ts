import { getApiUrl } from "./config.js";

export { getApiUrl };

export function isMockMode(): boolean {
  return process.env.BURON_MOCK === "1";
}

// ── Constants ──

const DEVICE_CLIENT_ID = "buron-cli";
const DEVICE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code";

// ── Response types ──

export interface DeviceAuthSession {
  sessionId: string;
  userCode: string;
  browserUrl: string;
}

export interface DeviceAuthPoll {
  status: "pending" | "complete" | "denied" | "expired";
  token?: string;
  email?: string;
}

export interface Team {
  id: string;
  name: string;
}

export interface Org {
  id: string;
  name: string;
  teams: Team[];
}

export interface LinkResponse {
  orgs: Org[];
}

export interface GenerateTokenResponse {
  token: string;
}

export interface ProjectStatusResponse {
  status: "backlog" | "planned" | "in_progress" | "paused" | "done" | "cancelled";
  assets?: Record<string, string>;
}

// ── Mock implementations ──

const mock = {
  createAuthSession(): DeviceAuthSession {
    return {
      sessionId: "dev_mock_001",
      userCode: "ABCD1234",
      browserUrl: "http://localhost:3000/device?user_code=ABCD1234",
    };
  },

  pollAuthSession(): DeviceAuthPoll {
    return { status: "complete", token: "brn_mock_xxx", email: "dev@example.com" };
  },

  logout(): void {},

  link(): LinkResponse {
    return {
      orgs: [
        {
          id: "org_mock_001",
          name: "Acme Inc",
          teams: [{ id: "team_mock_001", name: "Marketing" }],
        },
      ],
    };
  },

  generateToken(): GenerateTokenResponse {
    return { token: "brnci_mock_xxx" };
  },

  projectStatus(): ProjectStatusResponse {
    return { status: "done", assets: {} };
  },
};

// ── Real API client ──

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Session expired. Run `buron login` again");
    }

    let message = `API error: ${res.status}`;
    try {
      const errorBody = (await res.json()) as {
        error?: string;
        message?: string;
        cause?: string;
      };
      if (errorBody.error) {
        message = errorBody.error;
      } else if (errorBody.message) {
        message = errorBody.message;
      }
      if (errorBody.cause) {
        message = `${message}: ${errorBody.cause}`;
      }
    } catch {
      // use default message
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ── Public API ──

export const api = {
  async createAuthSession(): Promise<DeviceAuthSession> {
    if (isMockMode()) return mock.createAuthSession();

    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/auth/device/code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: DEVICE_CLIENT_ID }),
    });

    if (!res.ok) {
      throw new Error("Couldn't start login. Check your connection and try again");
    }

    const data = (await res.json()) as {
      device_code: string;
      user_code: string;
      verification_uri: string;
      verification_uri_complete: string;
    };

    const approvalUrl = new URL(data.verification_uri_complete);
    approvalUrl.pathname = `${approvalUrl.pathname.replace(/\/$/, "")}/approve`;
    approvalUrl.searchParams.set("user_code", data.user_code);

    return {
      sessionId: data.device_code,
      userCode: data.user_code,
      browserUrl: approvalUrl.toString(),
    };
  },

  async pollAuthSession(deviceCode: string): Promise<DeviceAuthPoll> {
    if (isMockMode()) return mock.pollAuthSession();

    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/auth/device/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: DEVICE_GRANT_TYPE,
        device_code: deviceCode,
        client_id: DEVICE_CLIENT_ID,
      }),
    });

    if (!res.ok) {
      const errorBody = (await res.json()) as { error?: string };

      if (errorBody.error === "access_denied") {
        return { status: "denied" };
      }
      if (errorBody.error === "expired_token") {
        return { status: "expired" };
      }
      return { status: "pending" };
    }

    const data = (await res.json()) as { access_token: string };

    const sessionRes = await fetch(`${baseUrl}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });

    let email = "";
    if (sessionRes.ok) {
      const sessionData = (await sessionRes.json()) as {
        user?: { email?: string };
      };
      email = sessionData?.user?.email ?? "";
    }

    return {
      status: "complete",
      token: data.access_token,
      email,
    };
  },

  async logout(token: string): Promise<void> {
    if (isMockMode()) return mock.logout();
    await request("POST", "/api/auth/sign-out", { token });
  },

  async link(repoUrl: string, repoName: string, token: string): Promise<LinkResponse> {
    if (isMockMode()) return mock.link();
    return request<LinkResponse>("POST", "/api/v1/link", {
      body: { repoUrl, repoName },
      token,
    });
  },

  async generateToken(teamId: string, token: string): Promise<GenerateTokenResponse> {
    if (isMockMode()) return mock.generateToken();
    return request<GenerateTokenResponse>("POST", "/api/v1/tokens", {
      body: { teamId },
      token,
    });
  },

  async projectStatus(
    teamId: string,
    projectId: string,
    token: string,
  ): Promise<ProjectStatusResponse> {
    if (isMockMode()) return mock.projectStatus();
    return request<ProjectStatusResponse>(
      "GET",
      `/api/v1/teams/${teamId}/projects/${projectId}/status`,
      { token },
    );
  },

  files: {
    async read(teamId: string, path: string, token: string): Promise<FileReadResponse> {
      return request<FileReadResponse>("POST", `/api/v1/teams/${teamId}/files/read`, {
        body: { path },
        token,
      });
    },

    async write(
      teamId: string,
      path: string,
      content: string,
      token: string,
      metadata?: Record<string, unknown>,
    ): Promise<FileWriteResponse> {
      return request<FileWriteResponse>("POST", `/api/v1/teams/${teamId}/files/write`, {
        body: { path, content, metadata },
        token,
      });
    },

    async append(
      teamId: string,
      path: string,
      content: string,
      token: string,
    ): Promise<FileWriteResponse> {
      return request<FileWriteResponse>("POST", `/api/v1/teams/${teamId}/files/append`, {
        body: { path, content },
        token,
      });
    },

    async list(teamId: string, token: string, directory?: string): Promise<FileListResponse> {
      return request<FileListResponse>("POST", `/api/v1/teams/${teamId}/files/list`, {
        body: { directory },
        token,
      });
    },

    async glob(teamId: string, pattern: string, token: string): Promise<FileListResponse> {
      return request<FileListResponse>("POST", `/api/v1/teams/${teamId}/files/glob`, {
        body: { pattern },
        token,
      });
    },

    async grep(
      teamId: string,
      pattern: string,
      token: string,
      directory?: string,
    ): Promise<FileGrepResponse> {
      return request<FileGrepResponse>("POST", `/api/v1/teams/${teamId}/files/grep`, {
        body: { pattern, directory },
        token,
      });
    },

    async delete(
      teamId: string,
      path: string,
      token: string,
    ): Promise<{ deleted: boolean; path: string }> {
      return request<{ deleted: boolean; path: string }>(
        "POST",
        `/api/v1/teams/${teamId}/files/delete`,
        { body: { path }, token },
      );
    },

    async move(teamId: string, from: string, to: string, token: string): Promise<{ path: string }> {
      return request<{ path: string }>("POST", `/api/v1/teams/${teamId}/files/move`, {
        body: { from, to },
        token,
      });
    },

    async replace(
      teamId: string,
      path: string,
      oldString: string,
      newString: string,
      token: string,
      replaceAll?: boolean,
    ): Promise<FileWriteResponse> {
      return request<FileWriteResponse>("POST", `/api/v1/teams/${teamId}/files/replace`, {
        body: { path, oldString, newString, replaceAll },
        token,
      });
    },
  },

  // ── Data API ──

  data: {
    async listDatasets(orgId: string, teamId: string, token: string): Promise<DatasetListResponse> {
      const params = new URLSearchParams({ teamId, orgId });
      return request<DatasetListResponse>("GET", `/api/v1/datasets?${params}`, { token });
    },

    async describeDataset(id: string, token: string): Promise<unknown> {
      return request<unknown>("GET", `/api/v1/datasets/${encodeURIComponent(id)}`, { token });
    },

    async queryDataset(
      orgId: string,
      teamId: string,
      id: string,
      query: SemanticQuery,
      token: string,
    ): Promise<unknown> {
      return request<unknown>("POST", `/api/v1/datasets/${encodeURIComponent(id)}/query`, {
        body: { orgId, teamId, ...query },
        token,
      });
    },

    async warehouseSql(
      orgId: string,
      teamId: string,
      sql: string,
      token: string,
    ): Promise<unknown> {
      return request<unknown>("POST", "/api/v1/warehouse/sql", {
        body: { orgId, teamId, sql },
        token,
      });
    },

    async listQueries(
      orgId: string,
      teamId: string,
      token: string,
      dataset?: string,
    ): Promise<QueryListResponse> {
      const params = new URLSearchParams({ teamId, orgId });
      if (dataset) params.set("dataset", dataset);
      return request<QueryListResponse>("GET", `/api/v1/queries?${params}`, { token });
    },

    async createQuery(
      orgId: string,
      teamId: string,
      name: string,
      query: SemanticQuery,
      token: string,
      viz?: Record<string, unknown>,
    ): Promise<SavedQueryResponse> {
      return request<SavedQueryResponse>("POST", "/api/v1/queries", {
        body: { orgId, teamId, name, query, viz },
        token,
      });
    },

    async runQuery(orgId: string, teamId: string, id: string, token: string): Promise<unknown> {
      const params = new URLSearchParams({ teamId, orgId });
      return request<unknown>("POST", `/api/v1/queries/${id}/run?${params}`, { token });
    },

    async addDashboardPanel(
      orgId: string,
      teamId: string,
      dashboardId: string,
      queryId: string,
      token: string,
    ): Promise<unknown> {
      return request<unknown>(
        "POST",
        `/api/v1/dashboards/${encodeURIComponent(dashboardId)}/panels`,
        { body: { orgId, teamId, queryId }, token },
      );
    },

    async listDashboards(
      orgId: string,
      teamId: string,
      token: string,
    ): Promise<DashboardListResponse> {
      const params = new URLSearchParams({ teamId, orgId });
      return request<DashboardListResponse>("GET", `/api/v1/dashboards?${params}`, { token });
    },

    async runDashboard(
      orgId: string,
      teamId: string,
      id: string,
      from: string,
      to: string,
      token: string,
      fresh?: boolean,
    ): Promise<unknown> {
      const freshParam = fresh ? "&fresh=1" : "";
      return request<unknown>("POST", `/api/v1/dashboards/${id}/run?${freshParam}`, {
        body: { orgId, teamId, from, to },
        token,
      });
    },

    async getIntegration(
      orgId: string,
      teamId: string,
      provider: string,
      token: string,
    ): Promise<IntegrationResponse> {
      const params = new URLSearchParams({ teamId, orgId });
      return request<IntegrationResponse>("GET", `/api/v1/integrations/${provider}?${params}`, {
        token,
      });
    },
  },
};

// ── Data API response types ──

/**
 * A semantic query — dataset + field picks. Mirrors the app's SemanticQuery
 * wire contract (specs/2026-07-10-agent-semantic-datasets/contracts). The
 * server validates; these types are display-level only.
 */
export interface SemanticQuery {
  dataset?: string;
  measures?: string[];
  dimensions?: string[];
  filters?: Array<{
    field: string;
    op: string;
    value?: string | number | (string | number)[];
    valueEnd?: string | number;
    negated?: boolean;
    logic?: "and" | "or";
  }>;
  dateRange?: { from: string; to: string; granularity?: string };
  orderBy?: Array<{ field: string; dir: "asc" | "desc" }>;
  limit?: number;
}

export interface DatasetSummary {
  id: string;
  name: string;
  description: string;
  family: string;
  live: boolean;
  availability: {
    available: boolean;
    reason?: string;
    action?: string;
    connectUrl?: string;
  };
}

export interface DatasetListResponse {
  datasets: DatasetSummary[];
}

export interface SavedQueryResponse {
  id: string;
  name: string;
  dataset: string | null;
  kind: "structured" | "raw-sql";
  query: SemanticQuery | null;
  uri: string;
  updatedAt?: string;
}

export interface QueryListResponse {
  queries: SavedQueryResponse[];
}

export interface DashboardSummary {
  id: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface DashboardListResponse {
  dashboards: DashboardSummary[];
}

export interface IntegrationResponse {
  connected: boolean;
  provider: string;
  status?: string;
  externalAccountId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── File API response types ──

export interface FileReadResponse {
  found: boolean;
  path: string;
  content?: string;
  metadata?: Record<string, unknown>;
  updatedAt?: string;
}

export interface FileWriteResponse {
  path: string;
  bytes: number;
}

export interface FileListResponse {
  files: Array<{
    path: string;
    metadata?: Record<string, unknown>;
    updatedAt?: string;
  }>;
}

export interface FileGrepResponse {
  matches: Array<{
    path: string;
    line?: number;
    content?: string;
  }>;
}
