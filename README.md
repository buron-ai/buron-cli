# Buron CLI

The developer CLI for [Buron](https://buron.ai) -- connect your codebase and generate marketing assets when you ship.

## Requirements

Node 18 or newer.

## Install

```bash
npm i -g buron
```

Or run directly:

```bash
npx buron
```

## Quick Start

```bash
buron login
buron link
buron setup
```

Then run `/launch` in your editor. The agent writes a launch context file to `.buron/launches/<uuid>.md`. Commit it as part of your PR — Buron picks up new launch files when they land in the repo.

## Commands

| Command | Description |
|---------|-------------|
| `buron login` | Authenticate with Buron (opens browser) |
| `buron logout` | Clear stored credentials |
| `buron link` | Link the current repo to a Buron team |
| `buron setup` | Log in, link this repo, scaffold Buron files, and install editor skills |
| `buron sync` | Refresh the launch skill in your installed editor folders |
| `buron setup-ci` | Set up a GitHub Actions workflow for automated launches |

## How It Works

1. **Login** authenticates you via the browser -- no tokens to copy-paste.
2. **Link** connects your repo to your Buron org and team. If you have multiple teams, you pick one.
3. **Setup** creates a `.buron/` directory in your repo with a `product-context.md` file and installs the `launch` skill into your selected editor folders.
4. When you're ready to ship, run `/launch` in your editor. The agent reads your git diff and writes a launch context file to `.buron/launches/<uuid>.md`.
5. Commit the launch file as part of your PR (or set up CI with `buron setup-ci` to have it authored and committed automatically).
6. Buron picks up new launch files via its GitHub App, reads the project context plus the launch context, and generates marketing assets -- blog posts, changelogs, social posts, and more.

Buron never sees your source code beyond what you commit. It only reads the two markdown files you've explicitly written into `.buron/`. The launch-authoring agent runs in your environment using your own AI provider.

## What Gets Sent

Only two markdown files:

- `.buron/product-context.md` -- stable project context (product, audience, tone)
- `.buron/launches/<date>-<slug>.md` -- per-launch context (what shipped, why it matters)

That's it. No code, no git history, no secrets.

## Skill updates

The launch skill written into `.cursor/skills/launch/SKILL.md`, `.claude/skills/launch/SKILL.md`, etc. is the prompt your editor's AI agent follows during `/launch`. We tune it over time. Run `buron sync` to fetch the latest skill and overwrite your local copies (it leaves any local edits alone and warns you instead). The fetch is best-effort with a 2-second timeout — offline or unreachable hosts fall back to the bundled copy.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `BURON_API_URL` | `https://app.buron.ai` | Override the Buron API host. Useful for self-hosted backends or local development. |
| `BURON_MOCK` | unset | Set to `1` to run all commands against an in-memory mock backend. Used for offline development and contributor onboarding. |
| `BURON_NO_SKILL_REFRESH` | unset | Set to `1` to disable the skill update check on `buron sync`. |

Auth and project state are stored in:

- **`auth.json`** — your account token (created by `buron login`, removed by `buron logout`). Stored in your OS's config dir with `0600` permissions:
  - macOS: `~/Library/Application Support/com.buron.cli/`
  - Linux: `$XDG_CONFIG_HOME/com.buron.cli/` (defaults to `~/.config/com.buron.cli/`)
  - Windows: `%APPDATA%\com.buron.cli\`
- **`.buron/config.json`** — repo-to-team mapping, stored in your project root (created by `buron link`).

`BURON_API_URL` must use `https://` unless the host is `localhost`, `127.0.0.1`, or `::1` for local development.

## Development

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

## License

MIT
