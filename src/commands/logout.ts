import { clearAuth, readAuth } from "../lib/auth.js";
import { api } from "../lib/api.js";
import { blank, error, info, success } from "../lib/ui.js";

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
  blank();
  success("Logged out");
}
