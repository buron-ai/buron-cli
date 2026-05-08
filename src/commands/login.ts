import open from "open";
import { api, isMockMode } from "../lib/api.js";
import { readAuth, writeAuth } from "../lib/auth.js";
import { blank, error, fatal, info, link, spinner, success } from "../lib/ui.js";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

export async function loginCommand(): Promise<void> {
  const existing = readAuth();
  if (existing) {
    info(`Already logged in as ${existing.email}`);
    info("Run `buron logout` first to switch accounts.");
    return;
  }

  try {
    if (isMockMode()) {
      const s = spinner("Authenticating (mock mode)...");
      s.start();
      await sleep(1_500);
      writeAuth({ token: "brn_mock_xxx", email: "dev@example.com" });
      s.stop();
      blank();
      success("Logged in as dev@example.com");
      return;
    }

    const session = await api.createAuthSession();

    blank();
    info(`Your code: ${session.userCode}`);
    blank();
    info("Opening browser to log in...");
    info(link(session.browserUrl));
    blank();

    await open(session.browserUrl);

    const s = spinner("Waiting for authentication...");
    s.start();

    const startTime = Date.now();

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      await sleep(POLL_INTERVAL_MS);

      const poll = await api.pollAuthSession(session.sessionId);

      if (poll.status === "complete" && poll.token && poll.email) {
        s.stop();
        writeAuth({ token: poll.token, email: poll.email });
        blank();
        success(`Logged in as ${poll.email}`);
        return;
      }

      if (poll.status === "denied") {
        s.stop();
        fatal("Access denied. The device was not authorized.");
      }

      if (poll.status === "expired") {
        s.stop();
        fatal("Code expired. Run `buron login` to try again.");
      }
    }

    s.stop();
    fatal("Authentication timed out. Run `buron login` to try again.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(`Login failed: ${message}`);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
