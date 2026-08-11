import { select } from "@inquirer/prompts";
import { api, type Org } from "./api.js";
import { getApiUrl, writeConfig } from "./config.js";
import { getRemoteUrl, getRepoName, isGitRepo } from "./git.js";
import { spinner } from "./ui.js";

export type LinkOutcome =
  | { linked: { orgName: string; teamName: string } }
  | { skipped: "not-a-repo" | "no-remote" | "no-orgs" };

/**
 * The org/team selection shared by `buron link` and the post-login
 * auto-link: fetch the user's orgs, prompt only where there is a real
 * choice, and persist the repo's project config. Returns `skipped`
 * reasons instead of exiting so login can degrade to a hint while
 * `buron link` stays loud. API failures throw — callers decide severity.
 */
export async function runLinkFlow(token: string): Promise<LinkOutcome> {
  if (!isGitRepo()) {
    return { skipped: "not-a-repo" };
  }

  const repoUrl = getRemoteUrl();
  const repoName = getRepoName();
  if (!repoUrl || !repoName) {
    return { skipped: "no-remote" };
  }

  const s = spinner("Linking...");
  s.start();
  let orgs: Org[];
  try {
    ({ orgs } = await api.link(repoUrl, repoName, token));
  } finally {
    s.stop();
  }

  if (orgs.length === 0) {
    return { skipped: "no-orgs" };
  }

  let selectedOrg: Org = orgs[0];
  if (orgs.length > 1) {
    const orgId = await select({
      message: "Which organization?",
      choices: orgs.map((o) => ({ name: o.name, value: o.id })),
    });
    selectedOrg = orgs.find((o) => o.id === orgId) ?? orgs[0];
  }

  let selectedTeam = selectedOrg.teams[0];
  if (selectedOrg.teams.length > 1) {
    const teamId = await select({
      message: "Which team should this repo be linked to?",
      choices: selectedOrg.teams.map((t) => ({ name: t.name, value: t.id })),
    });
    selectedTeam = selectedOrg.teams.find((t) => t.id === teamId) ?? selectedTeam;
  }

  writeConfig({
    orgId: selectedOrg.id,
    orgName: selectedOrg.name,
    teamId: selectedTeam.id,
    teamName: selectedTeam.name,
    apiUrl: getApiUrl(),
  });

  return {
    linked: { orgName: selectedOrg.name, teamName: selectedTeam.name },
  };
}
