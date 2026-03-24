import { getApiUrl } from "./config.js";

export function isMockMode(): boolean {
  return process.env.BURON_MOCK === "1";
}

// ── Response types ──

export interface AuthSessionResponse {
  sessionId: string;
  browserUrl: string;
}

export interface AuthPollResponse {
  status: "pending" | "complete";
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
  org: Org;
}

export interface PushResponse {
  launchId: string;
  dashboardUrl: string;
}

export interface GenerateTokenResponse {
  token: string;
}

export interface LaunchStatusResponse {
  status: "pending" | "generating" | "complete";
  assets?: Record<string, string>;
}

// ── Mock implementations ──

const mock = {
  createAuthSession(): AuthSessionResponse {
    return {
      sessionId: "mock_session_001",
      browserUrl: "https://app.buron.dev/cli-auth?session=mock_session_001",
    };
  },

  pollAuthSession(): AuthPollResponse {
    return {
      status: "complete",
      token: "brn_mock_xxx",
      email: "dev@example.com",
    };
  },

  logout(): void {},

  link(): LinkResponse {
    return {
      org: {
        id: "org_mock_001",
        name: "Acme Inc",
        teams: [{ id: "team_mock_001", name: "Marketing" }],
      },
    };
  },

  push(): PushResponse {
    return {
      launchId: "launch_mock_001",
      dashboardUrl: "https://app.buron.dev/acme/marketing/launches/launch_mock_001",
    };
  },

  generateToken(): GenerateTokenResponse {
    return { token: "brnci_mock_xxx" };
  },

  launchStatus(): LaunchStatusResponse {
    return { status: "complete", assets: {} };
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
      throw new Error("Session expired. Run `buron login` again.");
    }

    let message = `API error: ${res.status}`;
    try {
      const errorBody = (await res.json()) as { error?: string };
      if (errorBody.error) {
        message = errorBody.error;
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
  async createAuthSession(): Promise<AuthSessionResponse> {
    if (isMockMode()) return mock.createAuthSession();
    return request<AuthSessionResponse>("POST", "/api/cli/auth/session");
  },

  async pollAuthSession(sessionId: string): Promise<AuthPollResponse> {
    if (isMockMode()) return mock.pollAuthSession();
    return request<AuthPollResponse>("GET", `/api/cli/auth/session/${sessionId}`);
  },

  async logout(token: string): Promise<void> {
    if (isMockMode()) return mock.logout();
    await request("POST", "/api/cli/auth/logout", { token });
  },

  async link(repoUrl: string, repoName: string, token: string): Promise<LinkResponse> {
    if (isMockMode()) return mock.link();
    return request<LinkResponse>("POST", "/api/cli/link", {
      body: { repoUrl, repoName },
      token,
    });
  },

  async push(
    teamId: string,
    context: string,
    launch: string | null,
    token: string,
  ): Promise<PushResponse> {
    if (isMockMode()) return mock.push();
    return request<PushResponse>("POST", `/api/cli/teams/${teamId}/push`, {
      body: { context, launch },
      token,
    });
  },

  async generateToken(teamId: string, token: string): Promise<GenerateTokenResponse> {
    if (isMockMode()) return mock.generateToken();
    return request<GenerateTokenResponse>("POST", "/api/cli/tokens", {
      body: { teamId },
      token,
    });
  },

  async launchStatus(
    teamId: string,
    launchId: string,
    token: string,
  ): Promise<LaunchStatusResponse> {
    if (isMockMode()) return mock.launchStatus();
    return request<LaunchStatusResponse>(
      "GET",
      `/api/cli/teams/${teamId}/launches/${launchId}/status`,
      { token },
    );
  },
};
