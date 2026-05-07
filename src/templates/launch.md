---
name: launch
description: Prepare a Buron launch for this repository. Use when the user asks for /launch, launch notes, launch kits, or asks to prepare a launch. Also suggest a launch when a significant user-facing feature is completed — not for refactors or fixes.
---

# Launch

## How Buron uses these files

Buron is a marketing platform. When a launch file is committed to Buron's knowledge layer (via the MCP `writeFile` tool), Buron's marketing agents read the file and the product context to set up campaigns, generate blog posts, changelogs, social posts, sales enablement, and other customer-facing assets.

Your role is to provide accurate, specific, user-focused input. You are not writing marketing copy — the marketing agents handle positioning, tone, and messaging. Think of these files as a product brief handed to a marketing team: complete enough that they can write about the product without seeing the code, clean enough that nothing sensitive ends up in public content.

The more concrete and specific your writing, the better the downstream output. Vague descriptions produce vague marketing.

## Buron terminology

- **Product writeup** (`/wiki/entities/products/<product-slug>.md` in Buron's knowledge layer): durable description of one product. One file per product. Read at the start of every launch; updated when the product genuinely evolves.
- **Launch** (`/launches/<product-slug>/<YYYY-MM-DD-slug>.md` in Buron's knowledge layer): describes what shipped, for which product, on which date. Each launch triggers a marketing project on the Buron platform.
- **Project**: the work order Buron creates from a launch — a set of tasks like blog post, changelog entry, social posts, sales enablement, paid strategy, and SEO research / content writing.

## Sensitivity

These files feed into public-facing materials. Silently exclude:

- Security implementation details, vulnerability information, auth internals
- Infrastructure, deployment configuration, database schemas
- API keys, tokens, secrets, internal endpoints
- Internal tooling, build systems, CI/CD configuration
- Anything the company would not want publicly visible

Do not mention that content was excluded. Just leave it out.

## Step 1 — Resolve the product

The filesystem is the source of truth. List the products directory each run; do not persist a slug locally:

```bash
npx buron file list /wiki/entities/products/
```

Match the listing against this repo's signals (repo name, README, `package.json`, codebase clues). If exactly one product clearly matches, confirm with the user in one line. If multiple plausibly match, ask the user to pick. If none match, propose a new slug, draft a placeholder writeup, and create it via `npx buron file write /wiki/entities/products/<slug>.md` — but only after the user confirms the slug.

If the chosen product's writeup is empty or a placeholder, stop and ask the user to populate it before drafting the launch — marketing agents downstream rely on it for positioning and audience context.

## Step 2 — Read product context

```bash
npx buron file read /wiki/entities/products/<slug>.md
```

This is the canonical product context.

While reading the writeup, check whether it has unfilled placeholder comments or is missing details about capabilities you know exist in the codebase. If so, propose updates to the user; on confirmation, write the updated writeup back:

```bash
npx buron file write /wiki/entities/products/<slug>.md --from-file <local-draft-path>
```

Write from the user's perspective: what the product does, who uses it, what they can do with it. If the file already has good content, refine rather than overwrite. If the product has multiple distinct areas (e.g. a web app, CLI, and API), use `###` subheadings under Capabilities and How It Works to organize by area.

## Step 3 — Draft the launch

1. Detect the default branch: run `git remote show origin` and parse "HEAD branch", fall back to `main`.
2. Diff the current branch against the default branch.
3. Synthesize the diff into user-facing changes — multiple commits that build one feature should be described as one change, not listed individually.
4. Name the file using today's date and a short descriptive slug (e.g. `2026-04-02-device-auth.md`).
5. Write a local draft to `.buron/launches/<YYYY-MM-DD-slug>.md` so the user can review and edit using the IDE's normal diff tools.

### Launch file structure

```
# Launch: <descriptive title>

## Summary
What shipped, from the user's perspective. Describe features, not commits.
Synthesize multiple commits into coherent changes.

## What's New
User-facing changes. What can users do now that they couldn't before?
What changed in their experience? Group related changes.

## Who This Affects
Which users, roles, or use cases benefit from these changes.

## Breaking Changes
Changes requiring user action: migrations, API changes, deprecations,
changed defaults. Write "None" if not applicable.
```

### What to include

- Features and capabilities users can see or use
- Changed behavior that affects user experience
- New integrations or platform support
- Performance improvements users would notice

### What to exclude

- Refactors with no user-facing impact
- Dependency updates, build changes, test additions
- Infrastructure or deployment changes
- Code cleanup, linting fixes, internal tooling

## Step 4 — Commit to Buron's knowledge layer

Once the user has reviewed the local draft and is happy with it, commit it via the Buron CLI:

```bash
npx buron file write /launches/<slug>/<YYYY-MM-DD-slug>.md \
  --from-file .buron/launches/<YYYY-MM-DD-slug>.md
```

`<slug>` is the product slug from step 1. The local `.buron/launches/<slug>.md` stays in the repo as a working copy.

The platform-side workflow that creates the marketing project from this write is being migrated; for now a launch lands in the knowledge layer but the project may need to be created manually in the Buron app until the migration completes.

## Step 5 — Confirm and exit

Confirm what was written: the path the launch landed at, the product it's scoped to, and that the marketing project should appear on the Buron dashboard within a few minutes. Then exit.
