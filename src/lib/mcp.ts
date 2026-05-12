import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ProjectConfig } from "./config.js";
import type { SkillInstallTarget } from "./paths.js";

interface McpServerEntry {
  type: string;
  url: string;
}

export function getMcpUrl(config: ProjectConfig): string {
  return `${config.apiUrl}/api/mcp?teamId=${config.teamId}`;
}

export function getMcpConfigPath(
  target: SkillInstallTarget,
): { path: string; shape: "mcpServers" | "servers" } | null {
  const root = process.cwd();

  switch (target) {
    case "claude-code":
      return {
        path: join(root, ".claude", "settings.local.json"),
        shape: "mcpServers",
      };
    case "cursor":
      return { path: join(root, ".cursor", "mcp.json"), shape: "mcpServers" };
    case "copilot":
      return { path: join(root, ".vscode", "mcp.json"), shape: "servers" };
    default:
      return null;
  }
}

export function installMcpServer(target: SkillInstallTarget, config: ProjectConfig): boolean {
  const mcpConfig = getMcpConfigPath(target);
  if (!mcpConfig) return false;

  const entry: McpServerEntry = {
    type: "streamable-http",
    url: getMcpUrl(config),
  };

  const dir = dirname(mcpConfig.path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let existing: Record<string, unknown> = {};
  if (existsSync(mcpConfig.path)) {
    try {
      existing = JSON.parse(readFileSync(mcpConfig.path, "utf-8"));
    } catch {
      existing = {};
    }
  }

  const key = mcpConfig.shape;
  const servers = (existing[key] as Record<string, unknown> | undefined) ?? {};
  servers.buron = entry;
  existing[key] = servers;

  writeFileSync(mcpConfig.path, `${JSON.stringify(existing, null, 2)}\n`, "utf-8");
  return true;
}

export function getMcpTargetLabel(target: SkillInstallTarget): string {
  switch (target) {
    case "claude-code":
      return "Claude Code";
    case "cursor":
      return "Cursor";
    case "copilot":
      return "GitHub Copilot";
    default:
      return target;
  }
}

export const MCP_SUPPORTED_TARGETS: SkillInstallTarget[] = ["claude-code", "cursor", "copilot"];
