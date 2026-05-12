import { api } from "../lib/api.js";
import { clearAuth, readAuth } from "../lib/auth.js";
import { clearConfig } from "../lib/config.js";
import { blank, info, success } from "../lib/ui.js";

export async function logoutCommand(): Promise<void> {
  const auth = readAuth();

  if (!auth) {
    info("Not currently logged in.");
    return;
  }

  try {
    await api.logout(auth.token);
  } catch {
    // Server invalidation is best-effort
  }

  clearAuth();
  clearConfig();
  blank();
  success("Logged out");
}
