---
name: launch
description: Prepare a Buron launch for this repository. Use when the user asks for /launch, launch notes, launch kits, or asks to prepare content for buron push. Also suggest a launch when a significant user-facing feature is completed — not for refactors or fixes.
---

# Launch

## How Buron uses these files

Buron is a marketing platform. When you run `buron push`, the product context
and launch file are sent to Buron where marketing agents use them to setup up campaigns, 
generate blog posts, changelogs, social posts, sales enablement, and other customer-facing marketing assets.

Your role is to provide accurate, specific, user-focused input. You are not
writing marketing copy — the marketing agents handle positioning, tone, and
messaging. Think of these files as a product brief handed to a marketing team:
complete enough that they can write about the product without seeing the code,
clean enough that nothing sensitive ends up in public content.

The more concrete and specific your writing, the better the downstream output.
Vague descriptions produce vague marketing.

## Buron terminology

- **Product context** (`.buron/product-context.md`): durable product description
  for this repository. Updated infrequently.
- **Launch** (`.buron/launches/YYYY-MM-DD-slug.md`): describes what shipped.
  Each launch triggers a project on the Buron platform.
- **Project**: the work order Buron creates from a launch — a set of tasks like
  blog post, changelog entry, social posts, sales enablement, paid strategy, 
  and SEO research/content writing.

## Sensitivity

These files feed into public-facing materials. Silently exclude:

- Security implementation details, vulnerability information, auth internals
- Infrastructure, deployment configuration, database schemas
- API keys, tokens, secrets, internal endpoints
- Internal tooling, build systems, CI/CD configuration
- Anything the company would not want publicly visible

Do not mention that content was excluded. Just leave it out.

## Product context maintenance

When you read `.buron/product-context.md` — during a launch or any other time —
check whether it has unfilled placeholder comments or is missing details about
capabilities you know exist in the codebase. If so, fill them in.

Write from the user's perspective: what the product does, who uses it, what
they can do with it. If the file already has good content, refine rather than
overwrite.

If the product has multiple distinct areas (e.g. a web app, CLI, and API),
use ### subheadings under Capabilities and How It Works to organize by area.

## Launch workflow

When the user asks to prepare a launch:

1. Read `.buron/product-context.md` for baseline product understanding.
   Update it if it has gaps.
2. Detect the default branch: run `git remote show origin` and parse
   "HEAD branch", fall back to `main`.
3. Diff the current branch against the default branch.
4. Synthesize the diff into user-facing changes — multiple commits that
   build one feature should be described as one change, not listed
   individually.
5. Name the file using today's date and a short descriptive slug
   (e.g. `2026-04-02-device-auth.md`).
6. Write to `.buron/launches/YYYY-MM-DD-slug.md`.

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

### What to include in launches

- Features and capabilities users can see or use
- Changed behavior that affects user experience
- New integrations or platform support
- Performance improvements users would notice

### What to exclude from launches

- Refactors with no user-facing impact
- Dependency updates, build changes, test additions
- Infrastructure or deployment changes
- Code cleanup, linting fixes, internal tooling

## Push

After writing a launch file:

```bash
npx buron push
```

This uploads the product context and newest launch file to Buron.
