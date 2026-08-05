import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { api } from "../lib/api.js";
import { requireAuth } from "../lib/auth.js";
import { requireConfig } from "../lib/config.js";
import { blank, error, info, success } from "../lib/ui.js";

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

function fail(message: string): never {
  blank();
  error(message);
  process.exit(1);
}

async function resolveContent(opts: { content?: string; fromFile?: string }): Promise<string> {
  if (opts.content !== undefined) return opts.content;
  if (opts.fromFile) {
    return readFileSync(resolve(opts.fromFile), "utf-8");
  }
  const piped = await readStdin();
  if (!piped) {
    fail("No content provided. Pass --content, --from-file, or pipe via stdin");
  }
  return piped;
}

// ── read ─────────────────────────────────────────────────────────────

export async function fileReadCommand(path: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.files.read(config.teamId, path, auth.token);
    if (!result.found) {
      fail(`File not found: ${path}`);
    }
    process.stdout.write(result.content ?? "");
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── write ────────────────────────────────────────────────────────────

export async function fileWriteCommand(
  path: string,
  options: { content?: string; fromFile?: string },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const content = await resolveContent(options);
    const result = await api.files.write(config.teamId, path, content, auth.token);
    blank();
    success(`Wrote ${result.bytes} bytes → ${result.path}`);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── append ───────────────────────────────────────────────────────────

export async function fileAppendCommand(
  path: string,
  options: { content?: string; fromFile?: string },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const content = await resolveContent(options);
    const result = await api.files.append(config.teamId, path, content, auth.token);
    blank();
    success(`Appended → ${result.path} (${result.bytes} bytes total)`);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── list ─────────────────────────────────────────────────────────────

export async function fileListCommand(directory?: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.files.list(config.teamId, auth.token, directory);
    if (result.files.length === 0) {
      blank();
      info(directory ? `No files in ${directory}` : "No files");
      return;
    }
    for (const f of result.files) {
      process.stdout.write(`${f.path}\n`);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── glob ─────────────────────────────────────────────────────────────

export async function fileGlobCommand(pattern: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.files.glob(config.teamId, pattern, auth.token);
    if (result.files.length === 0) {
      blank();
      info(`No files match ${pattern}`);
      return;
    }
    for (const f of result.files) {
      process.stdout.write(`${f.path}\n`);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── grep ─────────────────────────────────────────────────────────────

export async function fileGrepCommand(
  pattern: string,
  options: { directory?: string },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.files.grep(
      config.teamId,
      pattern,
      auth.token,
      options.directory,
    );
    if (result.matches.length === 0) {
      blank();
      info("No matches");
      return;
    }
    for (const m of result.matches) {
      const line = m.line !== undefined ? `:${m.line}` : "";
      process.stdout.write(`${m.path}${line}: ${m.content ?? ""}\n`);
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── delete ───────────────────────────────────────────────────────────

export async function fileDeleteCommand(path: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.files.delete(config.teamId, path, auth.token);
    blank();
    success(`Deleted: ${result.path}`);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── move ─────────────────────────────────────────────────────────────

export async function fileMoveCommand(from: string, to: string): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.files.move(config.teamId, from, to, auth.token);
    blank();
    success(`Moved: ${from} → ${result.path}`);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}

// ── replace ──────────────────────────────────────────────────────────

export async function fileReplaceCommand(
  path: string,
  options: { old: string; new: string; all?: boolean },
): Promise<void> {
  try {
    const auth = requireAuth();
    const config = requireConfig();
    const result = await api.files.replace(
      config.teamId,
      path,
      options.old,
      options.new,
      auth.token,
      options.all,
    );
    blank();
    success(`Replaced in ${result.path} (${result.bytes} bytes total)`);
  } catch (err) {
    fail(err instanceof Error ? err.message : "Unknown error");
  }
}
