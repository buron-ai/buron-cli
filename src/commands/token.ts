import { api } from "../lib/api.js";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { blank, error, info, success } from "../lib/ui.js";

/**
 * CI tokens: team-scoped API keys for headless environments (`BURON_TOKEN`).
 * Create prints the secret exactly once; list/revoke manage your own keys
 * in the linked workspace.
 */

export async function tokenCreateCommand(): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.createCiToken(config.teamId, auth.token);

    blank();
    success(`Token created for ${config.orgName} / ${config.teamName}`);
    blank();
    info(result.token);
    blank();
    info("This is the only time it's shown. Store it as a secret, e.g.:");
    info("  gh secret set BURON_TOKEN");
    info("CI jobs use it via the BURON_TOKEN environment variable.");
  } catch (err) {
    fail(err);
  }
}

export async function tokenListCommand(options: { json?: boolean }): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const { tokens } = await api.listCiTokens(config.teamId, auth.token);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(tokens, null, 2)}\n`);
      return;
    }

    blank();
    if (tokens.length === 0) {
      info("No CI tokens in this workspace. Create one with `buron token create`.");
      return;
    }
    for (const token of tokens) {
      const last = token.lastRequest ? `last used ${token.lastRequest}` : "never used";
      info(`${token.id}  ${token.start ?? "****"}…  ${token.name ?? "unnamed"}  (${last})`);
    }
  } catch (err) {
    fail(err);
  }
}

export async function tokenRevokeCommand(id: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    await api.revokeCiToken(config.teamId, id, auth.token);
    blank();
    success("Token revoked");
  } catch (err) {
    fail(err);
  }
}

function fail(err: unknown): never {
  const message = err instanceof Error ? err.message : "Unknown error";
  blank();
  error(message);
  process.exit(1);
}
