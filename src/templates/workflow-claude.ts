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

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Run Buron Launch
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: \${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            Read .buron/product-context.md for background on this project.

            Look at the PR diff — what was added, changed, or removed?
            Why does it matter to end users?

            Generate a UUID and write a launch context file to
            .buron/launches/<uuid>.md.

            The file should include:
            - A summary of what shipped
            - Key changes (user-facing, not implementation details)
            - Why it matters (value to end users)
            - Any breaking changes or migration notes

            Then commit it to Buron:
            npx buron file write /launches/<product-slug>/<YYYY-MM-DD-slug>.md \\
              --from-file <local-launch-path>

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
