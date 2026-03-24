import { select } from "@inquirer/prompts";
import { requireAuth } from "../lib/auth.js";
import { api } from "../lib/api.js";
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

    const { org } = result;
    let selectedTeam = org.teams[0];

    if (org.teams.length > 1) {
      blank();
      info(`Organization: ${org.name}`);
      blank();

      const teamId = await select({
        message: "Which team should this repo be linked to?",
        choices: org.teams.map((t) => ({
          name: t.name,
          value: t.id,
        })),
      });

      const found = org.teams.find((t) => t.id === teamId);
      if (found) {
        selectedTeam = found;
      }
    }

    writeConfig({
      orgId: org.id,
      orgName: org.name,
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      apiUrl: getApiUrl(),
    });

    blank();
    success(`Linked to ${org.name} / ${selectedTeam.name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    blank();
    error(message);
    process.exit(1);
  }
}
