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
      throw new Error("Failed to start auth session");
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
};
