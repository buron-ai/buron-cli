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
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: npm install --no-save @cursor/sdk tsx

      - name: Install Buron CLI
        run: npm i -g @buron/cli

      - name: File Buron source
        env:
          CURSOR_API_KEY: \${{ secrets.CURSOR_API_KEY }}
          BURON_TOKEN: \${{ secrets.BURON_TOKEN }}
        run: npx tsx .buron/ci/launch.ts
`;
