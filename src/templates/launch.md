---
name: launch
description: Prepare a Buron launch for this repository. Use when the user asks for /launch, launch notes, launch kits, or asks to prepare a launch. Also suggest a launch when a significant user-facing feature is completed — not for refactors or fixes. On first run for a product, also bootstraps the product writeup and offers to backfill recent shipments.
---

# Launch

## How Buron uses these files

Buron is a marketing platform. When a launch file is committed to Buron's knowledge layer (via the CLI's `file write` command), Buron's marketing agents read the file and the product context to set up campaigns, generate blog posts, changelogs, social posts, sales enablement, and other customer-facing assets.

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

Pick the slug autonomously from this repo's signals — don't prompt the user. In order of preference:

1. **Exact match** — if a listed slug matches the `package.json` `name` field (after stripping a leading scope like `@org/`) or the repo directory name, use it.
2. **Fuzzy match** — if a listed slug obviously refers to this repo (e.g. `buron-cli` slug for a repo named `buron-cli` or its `name` is `buron`), use it.
3. **Derive a new slug** — if nothing matches, derive a kebab-case slug from the `package.json` name (preferred) or the repo directory name, and proceed with that. The new slug's writeup gets created in step 2's bootstrap path.

Print one line stating which slug you picked (e.g. `Using product: cli`). Only ask the user if more than one listed slug is genuinely ambiguous after applying both match rules — that's rare.

## Step 2 — Ensure the product writeup is populated

```bash
npx buron file read /wiki/entities/products/<slug>.md
```

Three cases:

- **Populated and accurate.** Hold as the canonical product context, proceed to step 3.
- **Populated but stale or thin** (missing capabilities you can see in the codebase, outdated audience description, missing recent surface area). Propose updates inline. On user confirm, write the refined version back via `npx buron file write /wiki/entities/products/<slug>.md --from-file <local-draft>`. Then proceed.
- **Empty / placeholder / does not exist.** Run the **bootstrap path** below.

### Bootstrap path (first-run for this product)

Read the repo exhaustively to draft a complete product writeup before drafting any launch. Inputs to read:

- `README.md`, `package.json` — what the product is, what it depends on
- `app/marketing/` or `app/(marketing)/` and `public/` — landing copy, audience signals, positioning language
- `app/` route structure — capability inventory (which surfaces exist)
- Pricing pages and signup flows — motion (B2C ecommerce / B2C subscription / B2B self-serve / B2B sales-led / B2B hybrid)
- Any `docs/`, `CHANGELOG.md`, or `apps/<name>/README.md` — what the team has already documented

Draft a complete writeup with these sections:

```
# <Product name>

## What it is
One sentence. What does this product do?

## Who it's for
Audience, ICP, primary use case. Specifics over generics.

## Capabilities
Grouped by surface (### subheadings) if the product has multiple distinct areas (e.g. a web app, CLI, and API). One bullet per user-visible capability.

## How it works
The user journey from first contact to value realised. End-to-end, in their words.

## Motion
{B2C ecommerce | B2C subscription | B2B self-serve | B2B sales-led | B2B hybrid}. One line on why.

## Status
{alpha | beta | GA | sunset}. Date or quarter if relevant.
```

Show the draft to the user, ask for confirmation/edits, then write via `npx buron file write /wiki/entities/products/<slug>.md --from-file <local-draft>`. After confirmation, proceed to step 3.

## Step 3 — First-run vs steady state

```bash
npx buron file list /launches/<slug>/
```

If the directory is empty (no prior launches for this product), offer the **backfill path** below. If non-empty, this is steady state — skip to step 4.

### Backfill path (first-run for this product)

The goal: capture the last few major user-facing shipments as historical launch artefacts so Buron has context on recent moves and can ground future content against what's already shipped. Then proceed to step 4 and draft the *current* launch on top.

1. Pull recent merge commits and feature commits:

   ```bash
   git log --since="60 days ago" --merges --pretty=format:"%h %s"
   git log --since="60 days ago" --pretty=format:"%h %s"
   ```

2. Cluster commits that build the same user-facing feature (multiple commits per shipment is normal). Title the cluster by the user-facing capability, not the implementation.

3. Filter aggressively — keep only the user-facing items. Drop refactors, dependency bumps, lint, tests, infra, internal tooling, doc-only changes.

4. Pick the top 5 most significant remaining clusters (offer to adjust the count or window if the user wants more / fewer).

5. Show the user the proposed list — slug, date, one-line summary — and confirm before drafting.

6. For each confirmed cluster:
   - Draft a launch file using the same structure as a current launch (see step 4)
   - Local draft path: `.buron/launches/<YYYY-MM-DD-slug>.md` (use the cluster's representative date — usually the merge date of the largest commit in the cluster)
   - Commit via `npx buron file write /launches/<slug>/<YYYY-MM-DD-slug>.md --from-file <local-draft>`

7. Once all backfilled launches are written, proceed to step 4 to draft the current launch.

Backfilled launches land in the knowledge layer for context but should not trigger marketing campaigns retroactively. (Platform-side: the marketing-project trigger is being migrated and will gain a `backfill` flag check; for now the trigger is dormant on knowledge-layer writes.)

## Step 4 — Draft the current launch

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

## Step 5 — Commit to Buron's knowledge layer

Once the user has reviewed the local draft and is happy with it, commit it via the Buron CLI:

```bash
npx buron file write /launches/<slug>/<YYYY-MM-DD-slug>.md \
  --from-file .buron/launches/<YYYY-MM-DD-slug>.md
```

`<slug>` is the product slug from step 1. The local `.buron/launches/<slug>.md` stays in the repo as a working copy.

The platform-side workflow that creates the marketing project from this write is being migrated; for now a launch lands in the knowledge layer but the project may need to be created manually in the Buron app until the migration completes.

## Step 6 — Confirm and exit

Confirm what was written: the path(s) the launch(es) landed at, the product they're scoped to, and that the marketing project should appear on the Buron dashboard within a few minutes (when the platform trigger lands). For first-run flows, also confirm the product writeup was bootstrapped and how many historical launches were backfilled.

Then exit.
