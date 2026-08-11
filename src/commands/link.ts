import { requireAuth } from "../lib/auth.js";
import { runLinkFlow } from "../lib/linking.js";
import { blank, error, fatal, success } from "../lib/ui.js";

export async function linkCommand(): Promise<void> {
  try {
    const auth = requireAuth();

    const outcome = await runLinkFlow(auth.token);

    if ("skipped" in outcome) {
      if (outcome.skipped === "not-a-repo") {
        fatal("Not a git repo. Run this from your project root");
      }
      if (outcome.skipped === "no-remote") {
        fatal("Couldn't detect a git remote. Make sure your repo has an origin remote");
      }
      fatal("No organizations found. Create one at app.buron.ai first");
    }

    blank();
    success(`Linked to ${outcome.linked.orgName} / ${outcome.linked.teamName}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
