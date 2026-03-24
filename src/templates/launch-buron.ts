export const LAUNCH_BURON_PROMPT = `Read .buron/context.md for background on this project.

Look at the git diff between the current branch and main:
- What was added, changed, or removed?
- Why does it matter to end users?
- What's the user-facing impact?

Write a launch context file to .buron/launches/ with today's date
and a short slug (e.g. .buron/launches/2026-03-23-auth-refactor.md).

The file should include:
- A summary of what shipped
- Key changes (user-facing, not implementation details)
- Why it matters (value to end users)
- Any breaking changes or migration notes

Then run: npx buron push

This uploads the context to Buron, which will generate marketing assets.
`;
