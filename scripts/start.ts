import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { emptySession } from "../mcp/session.js";

export const DEV_SESSION_RELATIVE_PATH = join(
  ".visual-aid",
  "dev-session.json",
);

export type StartMode = "start" | "print-codex-config" | "help";

export type SpawnLike = (
  command: string,
  args: readonly string[],
  options: SpawnOptions,
) => Pick<ChildProcess, "on">;

export const resolveDogfoodSessionPath = (cwd = process.cwd()) =>
  join(cwd, DEV_SESSION_RELATIVE_PATH);

export const ensureDogfoodSession = async (sessionPath: string) => {
  try {
    await access(sessionPath);
    return false;
  } catch {
    await mkdir(dirname(sessionPath), { recursive: true });
    await writeFile(
      sessionPath,
      `${JSON.stringify(emptySession(), null, 2)}\n`,
      "utf8",
    );

    return true;
  }
};

export const parseStartMode = (args: readonly string[]): StartMode => {
  if (args.includes("--help") || args.includes("-h")) {
    return "help";
  }

  if (args.includes("--print-codex-config")) {
    return "print-codex-config";
  }

  return "start";
};

const quoteTomlString = (value: string) => JSON.stringify(value);

export const renderCodexConfig = (
  cwd = process.cwd(),
  sessionPath = resolveDogfoodSessionPath(cwd),
) =>
  [
    "[mcp_servers.visual-aid]",
    'command = "npx"',
    'args = ["tsx", "mcp/server.ts"]',
    `cwd = ${quoteTomlString(cwd)}`,
    `env = { VISUAL_AID_SESSION_PATH = ${quoteTomlString(sessionPath)} }`,
  ].join("\n");

export const renderFishMcpCommand = () =>
  "env VISUAL_AID_SESSION_PATH=(pwd)/.visual-aid/dev-session.json npx tsx mcp/server.ts";

export const renderHelpText = (
  cwd = process.cwd(),
  sessionPath = resolveDogfoodSessionPath(cwd),
) =>
  [
    "Usage:",
    "  npm start",
    "  npm start -- --print-codex-config",
    "  npm start -- --help",
    "",
    "Dogfood flow:",
    `- create or reuse ${sessionPath}`,
    "- launch `npm run tauri:dev` with VISUAL_AID_SESSION_PATH set",
    "- leave MCP server startup to Codex config.toml",
    "",
    "Print the exact Codex MCP config for this checkout:",
    "  npm start -- --print-codex-config",
    "",
    "Fish manual MCP fallback:",
    `  ${renderFishMcpCommand()}`,
    "",
    "Docs:",
    `  ${join(cwd, "docs", "dogfooding.md")}`,
  ].join("\n");

export const resolveNpmRunCommand = (env: NodeJS.ProcessEnv = process.env) => {
  if (env.npm_execpath) {
    return {
      command: process.execPath,
      args: [env.npm_execpath, "run", "tauri:dev"],
    };
  }

  return {
    command: "npm",
    args: ["run", "tauri:dev"],
  };
};

export const spawnTauriDev = (
  sessionPath: string,
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
  spawnImpl: SpawnLike = spawn,
) => {
  const npmRun = resolveNpmRunCommand(env);

  return spawnImpl(npmRun.command, npmRun.args, {
    cwd,
    env: {
      ...env,
      VISUAL_AID_SESSION_PATH: sessionPath,
    },
    stdio: "inherit",
  });
};

const waitForExit = (child: Pick<ChildProcess, "on">) =>
  new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      resolve(code ?? 1);
    });
  });

export type StartSupervisorOptions = {
  args?: readonly string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  spawnImpl?: SpawnLike;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
};

export const runStartSupervisor = async ({
  args = process.argv.slice(2),
  cwd = process.cwd(),
  env = process.env,
  spawnImpl = spawn,
  stdout = process.stdout,
}: StartSupervisorOptions = {}) => {
  const sessionPath = resolveDogfoodSessionPath(cwd);
  const mode = parseStartMode(args);

  if (mode === "help") {
    stdout.write(`${renderHelpText(cwd, sessionPath)}\n`);
    return 0;
  }

  if (mode === "print-codex-config") {
    stdout.write(`${renderCodexConfig(cwd, sessionPath)}\n`);
    return 0;
  }

  const created = await ensureDogfoodSession(sessionPath);
  stdout.write(`${created ? "Created" : "Reusing"} ${sessionPath}\n`);
  stdout.write("Launching `npm run tauri:dev` with VISUAL_AID_SESSION_PATH set.\n");
  stdout.write(
    "Run `npm start -- --print-codex-config` to print the matching Codex MCP config.\n",
  );

  return waitForExit(spawnTauriDev(sessionPath, cwd, env, spawnImpl));
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runStartSupervisor().then(
    (code) => {
      process.exit(code);
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      process.stderr.write(`${message}\n`);
      process.exit(1);
    },
  );
}
