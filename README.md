# buron-cli

## Getting Started

### Supported Editors

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

That's it. The CLI installs `buron` globally; per-project state lives in `.buron/` after `buron link`.

## What It Does

`buron` is the headless interface to the [Buron](https://buron.ai) marketing platform. It connects your codebase to your Buron team and gives you programmatic access to everything the platform's agents operate on — read the team's knowledge layer, push code-change snapshots from your editor or CI, manage installed skills.

## How Do I Use This?

```bash
buron login          # Authenticate (opens browser)
buron link           # Link this repo to a Buron team
buron setup          # Scaffold .buron/ files and install editor skills
```

After setup, run `/launch` in your editor when you ship something. The platform handles the rest — clustering snapshots into launches, producing a brief and tracker, kicking off channel-specific evaluations.

You can also drive the platform headlessly from any script or CI job using `buron file` (read, write, search, organise files in the team's library).

## Components

### Editor Skills (2 skills)

Installed by `buron setup` into every editor folder you select.

| Skill | Trigger | What it does |
|-------|---------|--------------|
| `/launch` | Run after shipping | Files a structured snapshot of what changed (full git diff, PR thread, code comments, screenshots) into the team's knowledge layer. Buron's curator clusters accumulated snapshots into a launch — a frozen brief plus a living tracker — and channel-specific evaluators (paid, content, sales enablement) propose concrete next steps. |
| `/setup-google-ads-tracking` | Run on a new Google Ads integration | Walks you through a conversion-tracking spec — events, values, attribution — that Buron's Analytics and Ads workspaces read as the primary metric definition. |

### Commands

#### Auth + scoping

| Command | Purpose |
|---------|---------|
| `buron login` | Authenticate with Buron (opens browser) |
| `buron logout` | Clear stored credentials |
| `buron link` | Link the current repo to a Buron team |

#### Bootstrap

| Command | Purpose |
|---------|---------|
| `buron setup` | Log in, link the repo, scaffold `.buron/`, install editor skills |
| `buron setup-ci` | Generate a GitHub Actions workflow that runs `/launch` automatically on every PR |

#### File CRUD over the team's library

| Command | Purpose |
|---------|---------|
| `buron file read <path>` | Print a file's content |
| `buron file write <path>` | Write a file (`--content`, `--from-file`, or stdin) |
| `buron file append <path>` | Append to an existing file |
| `buron file list [directory]` | List files in a directory |
| `buron file glob <pattern>` | Find files matching a glob pattern |
| `buron file grep <pattern>` | Search file contents (regex) |
| `buron file delete <path>` | Delete a file |
| `buron file move <from> <to>` | Move or rename a file |
| `buron file replace <path>` | Find and replace within a file |

#### Skills

| Command | Purpose |
|---------|---------|
| `buron skills update` | Refresh installed editor skills with the latest templates |

## Usage

After installing and running `buron setup`, you can drive the platform from your editor (`/launch`, `/setup-google-ads-tracking`) or directly from the shell using `buron file`:

```bash
# Read your team's company profile
buron file read /wiki/company.md

# Find pages mentioning a competitor
buron file grep "Loopio" --directory /wiki/entities/

# Sync a daily report from CI into the Google Ads workspace
generate-report > /tmp/report.md
buron file write "/ads/google/reports/$(date +%Y-%m-%d).md" --from-file /tmp/report.md

# Pipe content from anywhere
echo "# Q2 recap" | buron file write /wiki/analyses/q2-recap.md
```

## Local Development

```bash
git clone https://github.com/buron-ai/buron-cli.git
cd buron-cli
npm install
npm run build
npm link
```

Run with mock mode (no backend needed):

```bash
BURON_MOCK=1 buron login
BURON_MOCK=1 buron link
BURON_MOCK=1 buron setup
```

## Reporting Issues

If something doesn't work, file an issue on [GitHub](https://github.com/buron-ai/buron-cli/issues). Include:

- What you were trying to do
- What command you ran (and its output)
- Which editor / CI environment you were in

## License

MIT
