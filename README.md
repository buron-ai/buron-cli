# Buron CLI

The developer CLI for [Buron](https://buron.dev) -- connect your codebase and generate marketing assets when you ship.

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

Then run `/launch-buron` in Claude Code or Cursor when you're ready to ship.

## Commands

| Command | Description |
|---------|-------------|
| `buron login` | Authenticate with Buron (opens browser) |
| `buron logout` | Clear stored credentials |
| `buron link` | Link the current repo to a Buron team |
| `buron setup` | Scaffold `.buron/` directory and install IDE commands |
| `buron push` | Upload context and launch files to Buron |
| `buron setup-ci` | Set up GitHub Actions for automated launches |

## How It Works

1. **Login** authenticates you via the browser -- no tokens to copy-paste.
2. **Link** connects your repo to your Buron org and team. If you have multiple teams, you pick one.
3. **Setup** creates a `.buron/` directory in your repo with a `context.md` file (product description, audience, tone) and installs a `/launch-buron` slash command in your IDE.
4. When you're ready to ship, run `/launch-buron` in your IDE. The agent reads your git diff, writes a launch context file, and runs `buron push`.
5. Buron receives two markdown files (project context + launch context) and generates marketing assets -- blog posts, changelogs, social posts, and more.

Buron never sees your code, never gets repo access, and never touches your API keys. The agent runs in your environment using your own AI provider.

## What Gets Sent

Only two markdown files:

- `.buron/context.md` -- stable project context (product, audience, tone)
- `.buron/launches/<date>-<slug>.md` -- per-launch context (what shipped, why it matters)

That's it. No code, no git history, no secrets.

## Development

```bash
git clone https://github.com/buron-dev/buron-cli.git
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
BURON_MOCK=1 buron push
```

## License

MIT
