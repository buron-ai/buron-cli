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

      - name: Run Buron Launch
        env:
          CURSOR_API_KEY: \${{ secrets.CURSOR_API_KEY }}
        run: |
          cursor-agent -p "
          Read .buron/context.md for background on this project.

          Look at the PR diff — what was added, changed, or removed?
          Why does it matter to end users?

          Write a launch context file to .buron/launches/ with today's date
          and a short slug based on the PR title.

          The file should include:
          - A summary of what shipped
          - Key changes (user-facing, not implementation details)
          - Why it matters (value to end users)
          - Any breaking changes or migration notes

          Then run: npx buron push
          "

      - name: Poll for assets
        env:
          BURON_TOKEN: \${{ secrets.BURON_TOKEN }}
        run: |
          echo "Waiting for Buron to generate assets..."
          for i in $(seq 1 15); do
            sleep 60
            STATUS=$(npx buron status --json 2>/dev/null | jq -r '.status' 2>/dev/null || echo "pending")
            if [ "$STATUS" = "complete" ]; then
              echo "Assets ready"
              break
            fi
            echo "Still generating... (attempt $i/15)"
          done
`;
