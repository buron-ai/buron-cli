import { select } from "@inquirer/prompts";
import { requireAuth } from "../lib/auth.js";
import { api, type Org } from "../lib/api.js";
import { writeConfig, getApiUrl } from "../lib/config.js";
import { getRemoteUrl, getRepoName, isGitRepo } from "../lib/git.js";
import { blank, error, fatal, info, spinner, success } from "../lib/ui.js";

export async function linkCommand(): Promise<void> {
  try {
    const auth = requireAuth();

    if (!isGitRepo()) {
      fatal("Not a git repository. Run this command from your project root.");
    }

    const repoUrl = getRemoteUrl();
    const repoName = getRepoName();

    if (!repoUrl || !repoName) {
      fatal("Could not detect git remote. Make sure your repo has an origin remote.");
    }

    const s = spinner("Linking...");
    s.start();

    const result = await api.link(repoUrl, repoName, auth.token);
    s.stop();

    const { orgs } = result;

    if (orgs.length === 0) {
      fatal("No organizations found. Create one at app.buron.dev first.");
    }

    let selectedOrg: Org;

    if (orgs.length === 1) {
      selectedOrg = orgs[0];
    } else {
      blank();
      const orgId = await select({
        message: "Which organization?",
        choices: orgs.map((o) => ({ name: o.name, value: o.id })),
      });
      const found = orgs.find((o) => o.id === orgId);
      if (!found) {
        fatal("Organization not found.");
        return;
      }
      selectedOrg = found;
    }

    let selectedTeam = selectedOrg.teams[0];

    if (selectedOrg.teams.length > 1) {
      blank();
      info(`Organization: ${selectedOrg.name}`);
      blank();

      const teamId = await select({
        message: "Which team should this repo be linked to?",
        choices: selectedOrg.teams.map((t) => ({
          name: t.name,
          value: t.id,
        })),
      });

      const found = selectedOrg.teams.find((t) => t.id === teamId);
      if (found) {
        selectedTeam = found;
      }
    }

    writeConfig({
      orgId: selectedOrg.id,
      orgName: selectedOrg.name,
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      apiUrl: getApiUrl(),
    });

    blank();
    success(`Linked to ${selectedOrg.name} / ${selectedTeam.name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
