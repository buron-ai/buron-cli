export const WORKFLOW_OPENAI = `name: Buron Launch

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
        run: npm install --no-save @openai/agents tsx

      - name: File Buron source
        env:
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: npx tsx .buron/ci/launch.ts
`;
