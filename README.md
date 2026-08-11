# @buron/cli

Your [Buron](https://buron.ai) marketing data and knowledge, from the terminal and CI. Also the fastest way to wire Buron's MCP server and skills into your AI editor.

## Installation

```bash
npm i -g @buron/cli
# or
pnpm add -g @buron/cli
```

Requires Node.js 18+.

## Quick start

```bash
buron login          # opens the browser; ends linked to your team
buron setup          # connect your editors: MCP server + skills
```

`setup` writes each editor's MCP config in its own convention (Claude Code `.mcp.json`, Cursor `.cursor/mcp.json`, VS Code `.vscode/mcp.json`, Codex `~/.codex/config.toml`) and installs Buron's skills through [`npx skills add buron-ai/skills`](https://github.com/buron-ai/skills), the open agent-skills installer.

Then ask your editor: "What was my ad spend in the last 7 days?"

## Query your data

```bash
buron datasets list
buron datasets query cross-channel-ads -m cost,conversions -d campaign_name \
  --from 2026-07-01 --to 2026-07-31 --sort cost:desc --limit 10

# Live Google Ads config reads the datasets don't cover
buron gaql "SELECT campaign.name, campaign.bidding_strategy_type FROM campaign WHERE campaign.status = 'ENABLED'"
```

`queries` and `dashboards` manage saved queries and run dashboards. Add `--json` to any read for pipeable output.

## Knowledge files

```bash
buron file read /wiki/company.md
echo "# Q2 recap" | buron file write /wiki/analyses/q2-recap.md
buron file grep "pricing" --directory /wiki/
```

## CI

Mint a token, store it as a secret, and every command works headless:

```bash
buron token create
gh secret set BURON_TOKEN
```

```yaml
- run: npm i -g @buron/cli
- run: buron file write /snapshots/$(date +%Y-%m-%d).md --from-file CHANGELOG.md
  env:
    BURON_TOKEN: ${{ secrets.BURON_TOKEN }}
```

## Docs

- [CLI documentation](https://buron.ai/docs/cli/installation)
- [MCP server and connection guides](https://buron.ai/docs/mcp)
- [Skills](https://github.com/buron-ai/skills)

## License

MIT
