import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ProjectConfig } from "./config.js";

/**
 * MCP wiring per editor, following each client's own convention (verified
 * against the official docs, 2026-08):
 *
 * - Claude Code reads project servers from `.mcp.json` at the repo root
 *   (NOT `.claude/settings.local.json`), `mcpServers` key, `type: "http"`.
 * - Cursor reads `.cursor/mcp.json`, `mcpServers` key, `url` only.
 * - VS Code / Copilot reads `.vscode/mcp.json`, `servers` key, `type: "http"`.
 * - Codex reads `~/.codex/config.toml`, `[mcp_servers.<name>]` with `url`;
 *   OAuth via `codex mcp login buron`.
 */

export const MCP_EDITOR_TARGETS = [
  { id: "claude-code", label: "Claude Code", detectPath: ".claude" },
  { id: "cursor", label: "Cursor", detectPath: ".cursor" },
  { id: "copilot", label: "GitHub Copilot", detectPath: ".vscode" },
  { id: "codex", label: "OpenAI Codex", detectPath: ".codex" },
] as const;

export type McpEditorTarget = (typeof MCP_EDITOR_TARGETS)[number]["id"];

export function getMcpUrl(config: ProjectConfig): string {
  // The clean URL resolves the caller's team server-side; the explicit
  // teamId pin is always correct and required for multi-team workspaces —
  // the CLI knows the linked team, so it pins.
  return `${config.apiUrl}/api/mcp?teamId=${config.teamId}`;
}

export interface McpInstallResult {
  path: string;
  action: "created" | "updated" | "kept";
}

function writeJsonServerEntry(
  filePath: string,
  rootKey: "mcpServers" | "servers",
  entry: Record<string, string>,
): McpInstallResult {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let existing: Record<string, unknown> = {};
  let existed = false;
  if (existsSync(filePath)) {
    existed = true;
    try {
      existing = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      existing = {};
    }
  }

  const servers = (existing[rootKey] as Record<string, unknown> | undefined) ?? {};
  servers.buron = entry;
  existing[rootKey] = servers;

  writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`, "utf-8");
  return { path: filePath, action: existed ? "updated" : "created" };
}

export function installMcpServer(target: McpEditorTarget, config: ProjectConfig): McpInstallResult {
  const root = process.cwd();
  const url = getMcpUrl(config);

  switch (target) {
    case "claude-code":
      return writeJsonServerEntry(join(root, ".mcp.json"), "mcpServers", {
        type: "http",
        url,
      });
    case "cursor":
      return writeJsonServerEntry(join(root, ".cursor", "mcp.json"), "mcpServers", {
        url,
      });
    case "copilot":
      return writeJsonServerEntry(join(root, ".vscode", "mcp.json"), "servers", {
        type: "http",
        url,
      });
    case "codex": {
      // TOML, appended once. Codex config is user-level; if a buron server
      // is already configured, leave the user's version alone.
      const configPath = join(homedir(), ".codex", "config.toml");
      const existing = existsSync(configPath) ? readFileSync(configPath, "utf-8") : "";
      if (existing.includes("[mcp_servers.buron]")) {
        return { path: configPath, action: "kept" };
      }
      const dir = dirname(configPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const block = `\n[mcp_servers.buron]\nurl = "${url}"\n`;
      writeFileSync(configPath, existing + block, "utf-8");
      return { path: configPath, action: existing ? "updated" : "created" };
    }
    default: {
      const never: never = target;
      throw new Error(`Unknown MCP target: ${never}`);
    }
  }
}
