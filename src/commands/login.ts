import open from "open";
import { api, isMockMode } from "../lib/api.js";
import { readAuth, writeAuth } from "../lib/auth.js";
import { blank, error, fatal, info, link, spinner, success } from "../lib/ui.js";

const POLL_TIMEOUT_MS = 5 * 60 * 1_000;
/** RFC 8628 §3.5: every `slow_down` grows the poll spacing by 5 seconds. */
const SLOW_DOWN_BACKOFF_MS = 5_000;
/** Consecutive 5xx poll answers tolerated before giving up. */
const MAX_TRANSIENT_POLL_FAILURES = 5;

export async function loginCommand(): Promise<void> {
  const existing = readAuth();
  if (existing) {
    // A token file existing is not the same as being logged in: a token
    // minted against another host (or since revoked) used to trap users in
    // a "Session expired" ⇄ "Already logged in" loop (ledger C3). Verify it
    // with one ping and fall through to a fresh device flow when dead.
    const check = await api.validateSession(existing.token);
    if (check === "valid") {
      info(`Already logged in as ${existing.email}`);
      info("Run `buron logout` first to switch accounts");
      return;
    }
    if (check === "unreachable") {
      fatal("Couldn't verify your session. Check your connection and try again");
    }
    info(`Stored session for ${existing.email} is no longer valid — signing in again`);
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
    // Poll at the server-advertised interval; polling faster gets every
    // request rejected with `slow_down` and login can never complete (C4).
    let pollDelayMs = session.pollIntervalMs;
    let transientFailures = 0;

    while (Date.now() - startTime < POLL_TIMEOUT_MS) {
      await sleep(pollDelayMs);

      const poll = await api.pollAuthSession(session.sessionId);

      if (poll.status === "transient") {
        transientFailures += 1;
        if (transientFailures > MAX_TRANSIENT_POLL_FAILURES) {
          s.stop();
          fatal(
            `Login poll kept failing (${poll.detail ?? "server error"}). Check your connection and run \`buron login\` again`,
          );
        }
        continue;
      }
      transientFailures = 0;

      if (poll.status === "complete" && poll.token && poll.email) {
        s.stop();
        writeAuth({ token: poll.token, email: poll.email });
        blank();
        success(`Logged in as ${poll.email}`);
        return;
      }

      if (poll.status === "slow_down") {
        pollDelayMs += SLOW_DOWN_BACKOFF_MS;
      }

      if (poll.status === "denied") {
        s.stop();
        fatal("Access denied. This device wasn't approved — try logging in again");
      }

      if (poll.status === "expired") {
        s.stop();
        fatal("Code expired. Run `buron login` to try again");
      }
    }

    s.stop();
    fatal("Login timed out. Run `buron login` to try again");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(`Couldn't log in: ${message}`);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
