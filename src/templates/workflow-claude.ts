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

      - name: Author launch file
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            A pull request was opened. Follow the launch skill installed in
            this repo (look in .claude/skills/launch/, .cursor/skills/launch/,
            .codex/skills/launch/, .github/skills/launch/, or
            .agents/skills/launch/ for SKILL.md) and write a launch context
            file to .buron/launches/<uuid>.md based on the PR diff.

            Do not commit, push, or run any CLI commands. Just write the file.

      - name: Commit launch file
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore: add Buron launch context"
          file_pattern: ".buron/launches/*.md"
`;
