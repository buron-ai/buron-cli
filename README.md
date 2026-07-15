# buron-cli

## Getting started

### Supported editors

| Editor | Status |
|--------|--------|
| [Cursor](https://www.cursor.com) | Supported |
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | Supported |
| [GitHub Copilot](https://github.com/features/copilot) | Supported |
| [OpenAI Codex](https://openai.com/index/codex/) | Supported |
| Generic (`.agents/`) | Supported |

### Prerequisites

- A [Buron](https://buron.ai) account
- Node.js 18+
- One of the supported editors above (optional — the CLI works standalone)

### Installation

```bash
npm i -g @buron/cli
# or
pnpm add -g @buron/cli
```

That's it. The CLI installs `buron` globally; per-project state lives in `.buron/` after you run `buron link`.

## Why

Marketing context lives in pull requests, commit messages, and the heads of the developers who wrote the code. By the time someone asks "what did we ship?", that context has decayed — changelogs are incomplete, blog posts are delayed, and half of what ships never gets announced.

`buron` captures that context at the moment it's freshest. Run `/launch` in your editor right after shipping and the AI agent reads the diff, PR thread, commit history, and code comments — everything you'd otherwise explain in a meeting. That structured snapshot goes to Buron, where a project-manager agent classifies the launch and domain agents take it from there: content agents generate changelog entries, blog posts, and social threads; the Google Ads agent updates campaigns, adjusts bids, and creates conversion actions tied to what you shipped. From there, Buron tracks performance across channels so you can see what's working and what isn't. The developer never writes a brief. The marketer never waits for one.

You don't have to run `/launch` by hand every time. Automate it:

- **CI** — run `buron setup-ci` to generate a GitHub Actions workflow that files a source on every PR
- **Claude Code** — set up a [routine](https://docs.anthropic.com/en/docs/claude-code/routines) that runs `/launch` on a schedule or trigger. If Buron's MCP server is connected, the CLI is already authenticated
- **Codex / Cursor** — use their task or automation features to invoke `/launch` after merges

## Quick start

```bash
buron login          # Log in (opens browser)
buron link           # Link this repo to a Buron team
buron setup          # Create .buron/ files and install editor skills
```

After setup, run `/launch` in your editor when you ship. Buron handles the rest — clustering snapshots into launches, generating content, and surfacing finished assets in the dashboard.

You can also read, write, and search files in your team's library from any script or CI job using `buron file`.

## Components

### Editor skills

Installed by `buron setup` into every editor folder you select.

| Skill | Trigger | What it does |
|-------|---------|--------------|
| `/launch` | Run after shipping | Captures what changed (diff, PR thread, code comments, screenshots) and pushes it to Buron. A PM agent classifies the launch tier, content agents generate assets (changelog, blog post, social threads), the Google Ads agent updates campaigns and conversion tracking, and Buron tracks performance across channels. |
| `/setup-google-ads-tracking` | Run on a new Google Ads integration | Walks you through a conversion-tracking spec — events, values, attribution — that Buron's analytics and ads workspaces read as the primary metric definition. |

### Commands

#### Auth and scoping

| Command | Purpose |
|---------|---------|
| `buron login` | Log in to Buron (opens browser) |
| `buron logout` | Clear stored credentials |
| `buron link` | Link the current repo to a Buron team |

#### Bootstrap

| Command | Purpose |
|---------|---------|
| `buron setup` | Log in, link the repo, create `.buron/`, install editor skills |
| `buron setup-ci` | Generate a GitHub Actions workflow that runs `/launch` on every PR |

#### File operations

| Command | Purpose |
|---------|---------|
| `buron file read <path>` | Print a file's content |
| `buron file write <path>` | Write a file (`--content`, `--from-file`, or stdin) |
| `buron file append <path>` | Append to an existing file |
| `buron file list [directory]` | List files in a directory |
| `buron file glob <pattern>` | Find files matching a glob pattern |
| `buron file grep <pattern>` | Search file contents by regex |
| `buron file delete <path>` | Delete a file |
| `buron file move <from> <to>` | Move or rename a file |
| `buron file replace <path>` | Find and replace text in a file |

#### Data

You query by picking metrics, dimensions, and filters from a dataset — there is no query language. Add `--json` to any read command for pipeable output.

| Command | Purpose |
|---------|---------|
| `buron datasets list` | List datasets this team can query, with availability |
| `buron datasets describe <id>` | Show a dataset's metrics, dimensions, and filter operators |
| `buron datasets query <id>` | Run a query (`-m` measures, `-d` dimensions, `-f field:op:value`, `--from/--to/--granularity`, `--sort`, `--limit`, or `--spec <file\|->`) |
| `buron sql <statement>` | Read-only SELECT against your warehouse (escape hatch; prefer `datasets query`) |
| `buron queries list` | List saved queries (`--dataset <id>` to filter) |
| `buron queries create <name> --spec <file\|->` | Save a structured query from a SemanticQuery spec |
| `buron queries run <id>` | Run a saved query and return fresh results |
| `buron dashboards list` | List available dashboards |
| `buron dashboards run <id> --from --to` | Run a dashboard for a date range |
| `buron dashboards add <dashboardId> <queryId>` | Add a saved query as a tile on a custom dashboard |
| `buron integration <provider>` | Check an integration's connection status |

#### Skills

| Command | Purpose |
|---------|---------|
| `buron skills update` | Refresh installed editor skills with the latest templates |

## Usage

After installing and running `buron setup`, drive the platform from your editor (`/launch`, `/setup-google-ads-tracking`) or from the shell with `buron file`:

```bash
# Pull a blog post draft into your MDX content directory
buron file read /wiki/launches/2025-05-onboarding-flow/blog.md \
  > content/blog/onboarding-flow.mdx

# Pull a changelog entry to commit alongside your release
buron file read /wiki/launches/2025-05-onboarding-flow/changelog.md \
  > CHANGELOG.md

# Discover what data you can query, then pick fields — no query language
buron datasets list
buron datasets describe cross-channel-ads

# Which ad creatives are performing best before a redesign
buron datasets query cross-channel-ads \
  -m cost,conversions -d ad_name \
  --from 2026-06-01 --to 2026-06-30 --sort conversions:desc --limit 10

# See what competitors are doing
buron file grep "positioning" --directory /wiki/entities/competitors/

# Check if the operator picked up your last launch
buron file list /wiki/sources/claude-code/

# Correct product details the curator got wrong
buron file replace /wiki/entities/products/my-app.md \
  --old "freemium SaaS" --new "usage-based SaaS"
```


## Reporting issues

If something doesn't work, file an issue on [GitHub](https://github.com/buron-ai/buron-cli/issues). Include:

- What you were trying to do
- What command you ran (and its output)
- Which editor or CI environment you were in

## License

MIT
