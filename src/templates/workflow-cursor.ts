export const WORKFLOW_CURSOR = `name: Buron Launch

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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install Cursor CLI
        run: npm install -g @anthropic-ai/cursor-cli

      - name: File Buron source
        env:
          CURSOR_API_KEY: \${{ secrets.CURSOR_API_KEY }}
        run: |
          cursor-agent -p "
          Read .buron/product-context.md for background on this project.

          Follow the /launch SKILL installed at .cursor/skills/launch/SKILL.md.
          You're running in CI, so use env=ci as the destination prefix.

          Gather rich context: full git diff, full commit messages with bodies,
          PR description and comments verbatim (via 'gh pr view --json'),
          linked issues verbatim, code comments, README/CHANGELOG sections
          changed in this branch.

          Do NOT compress into a marketing brief. Write a raw source dump per
          the SKILL's frontmatter and section structure, then push:

            npx buron file write /wiki/sources/ci/\\\$(date +%Y-%m-%d)-<slug>.md \\\\
              --from-file .buron/sources/ci/\\\$(date +%Y-%m-%d)-<slug>.md

          The Buron-side curator runs asynchronously and synthesises the
          launch brief from accumulated sources. Don't poll for assets here.
          "
`;
