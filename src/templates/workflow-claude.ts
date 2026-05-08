export const WORKFLOW_CLAUDE = `name: Buron Launch

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  contents: write
  pull-requests: write

jobs:
  buron-launch:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Buron CLI
        run: npm i -g @buron/cli

      - name: File Buron source
        uses: anthropics/claude-code-action@v1
        env:
          BURON_TOKEN: \${{ secrets.BURON_TOKEN }}
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Follow the /launch SKILL installed at .claude/skills/launch/SKILL.md.
            You're running in CI, so use env=ci as the destination prefix.

            Gather rich context: full git diff, full commit messages with bodies,
            PR description and comments verbatim (via 'gh pr view --json'),
            linked issues verbatim, code comments, README/CHANGELOG sections
            changed in this branch.

            Do NOT compress into a marketing brief. Write a raw source dump per
            the SKILL's frontmatter and section structure, then push:

              buron file write /wiki/sources/ci/$(date +%Y-%m-%d)-<slug>.md \\
                --from-file .buron/sources/ci/$(date +%Y-%m-%d)-<slug>.md

            The Buron-side curator runs asynchronously and synthesises the
            launch brief from accumulated sources. Don't poll for assets here.
`;
