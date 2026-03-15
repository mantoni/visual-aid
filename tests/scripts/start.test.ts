import { EventEmitter } from "node:events";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ChildProcess } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

import { emptySession } from "../../mcp/session.js";
import {
  renderCodexConfig,
  runStartSupervisor,
  type SpawnLike,
} from "../../scripts/start.js";

const tempRoots: string[] = [];

const createOutputBuffer = () => {
  const chunks: string[] = [];

  return {
    output: {
      write(value: string) {
        chunks.push(value);
        return true;
      },
    },
    text: () => chunks.join(""),
  };
};

const createSpawnStub = () => {
  const calls: {
    command: string;
    args: readonly string[];
    options: Parameters<SpawnLike>[2];
  }[] = [];

  const spawnImpl: SpawnLike = (command, args, options) => {
    calls.push({ command, args: [...args], options });

    const child = new EventEmitter();
    queueMicrotask(() => {
      child.emit("exit", 0, null);
    });

    return child as unknown as Pick<ChildProcess, "on">;
  };

  return { calls, spawnImpl };
};

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("Dogfooding start workflow spec", () => {
  it("VDF-START-001 npm start creates the canonical dev session file when missing", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-aid-start-"));
    tempRoots.push(root);
    const stdout = createOutputBuffer();
    const { calls, spawnImpl } = createSpawnStub();

    await runStartSupervisor({
      cwd: root,
      env: {
        HOME: process.env.HOME ?? "",
        PATH: process.env.PATH ?? "",
        npm_execpath: "/tmp/npm-cli.js",
      },
      spawnImpl,
      stdout: stdout.output,
    });

    const sessionPath = join(root, ".visual-aid", "dev-session.json");
    const session = JSON.parse(await readFile(sessionPath, "utf8"));

    expect(session).toEqual(emptySession());
    expect(calls).toHaveLength(1);
    expect(stdout.text()).toContain(`Created ${sessionPath}`);
  });

  it("VDF-START-002 npm start reuses the canonical dev session file without overwriting it", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-aid-start-"));
    tempRoots.push(root);
    const sessionPath = join(root, ".visual-aid", "dev-session.json");
    const existingSession = {
      openedAt: "2026-03-13T12:00:00.000Z",
      lastAction: "show",
      updatedAt: "2026-03-13T12:01:00.000Z",
      items: [
        {
          version: 1,
          format: "markdown",
          content: "# Existing",
          mode: "replace",
        },
      ],
    };

    await mkdir(join(root, ".visual-aid"), { recursive: true });
    await writeFile(sessionPath, JSON.stringify(existingSession, null, 2), "utf8");

    const stdout = createOutputBuffer();
    const { spawnImpl } = createSpawnStub();

    await runStartSupervisor({
      cwd: root,
      env: {
        HOME: process.env.HOME ?? "",
        PATH: process.env.PATH ?? "",
      },
      spawnImpl,
      stdout: stdout.output,
    });

    const session = JSON.parse(await readFile(sessionPath, "utf8"));

    expect(session).toEqual(existingSession);
    expect(stdout.text()).toContain(`Reusing ${sessionPath}`);
  });

  it("VDF-START-003 npm start launches tauri dev with the canonical session path in the environment", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-aid-start-"));
    tempRoots.push(root);
    const sessionPath = join(root, ".visual-aid", "dev-session.json");
    const { calls, spawnImpl } = createSpawnStub();

    await runStartSupervisor({
      cwd: root,
      env: {
        HOME: "/tmp/home",
        PATH: "/usr/bin:/bin",
        npm_execpath: "/tmp/npm-cli.js",
      },
      spawnImpl,
      stdout: createOutputBuffer().output,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      command: process.execPath,
      args: ["/tmp/npm-cli.js", "run", "tauri:dev"],
      options: {
        cwd: root,
        stdio: "inherit",
      },
    });
    expect(calls[0]?.options.env?.VISUAL_AID_SESSION_PATH).toBe(sessionPath);
    expect(calls[0]?.options.env?.PATH).toBe("/usr/bin:/bin");
  });

  it("VDF-START-004 npm start can print the matching Codex MCP config block without launching the app", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-aid-start-"));
    tempRoots.push(root);
    const stdout = createOutputBuffer();
    const { calls, spawnImpl } = createSpawnStub();

    const exitCode = await runStartSupervisor({
      args: ["--print-codex-config"],
      cwd: root,
      spawnImpl,
      stdout: stdout.output,
    });

    expect(exitCode).toBe(0);
    expect(stdout.text()).toBe(`${renderCodexConfig(root)}\n`);
    expect(stdout.text()).not.toContain(process.execPath);
    expect(calls).toHaveLength(0);
  });

  it("VDF-START-005 help output includes the fish fallback command and Codex config hint", async () => {
    const stdout = createOutputBuffer();
    const { calls, spawnImpl } = createSpawnStub();

    const exitCode = await runStartSupervisor({
      args: ["--help"],
      cwd: process.cwd(),
      spawnImpl,
      stdout: stdout.output,
    });

    expect(exitCode).toBe(0);
    expect(stdout.text()).toContain("npm start -- --print-codex-config");
    expect(stdout.text()).toContain(
      "env VISUAL_AID_SESSION_PATH=(pwd)/.visual-aid/dev-session.json npx tsx mcp/server.ts",
    );
    expect(calls).toHaveLength(0);
  });
});
