import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import { join, normalize } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

import tauriConfig from "../src-tauri/tauri.conf.json";

export type LaunchTarget =
  | {
      kind: "command";
      value: string;
      source: "VISUAL_AID_OPEN_COMMAND";
    }
  | {
      kind: "bundle";
      value: string;
      source: "VISUAL_AID_APP_PATH" | "detected release app bundle";
    }
  | {
      kind: "binary";
      value: string;
      source: "detected release binary" | "detected debug binary";
    };

const debugDevUrl = tauriConfig.build?.devUrl ?? null;

export const isDebugAppReachable = async (
  fetchImpl: typeof fetch = fetch,
) => {
  if (!debugDevUrl) {
    return false;
  }

  const controller = new AbortController();
  const timeout = delay(500, undefined, { signal: controller.signal }).then(() => {
    controller.abort();
  });

  try {
    const response = await fetchImpl(debugDevUrl, {
      signal: controller.signal,
    });
    controller.abort();
    await timeout.catch(() => undefined);
    return response.ok;
  } catch {
    controller.abort();
    await timeout.catch(() => undefined);
    return false;
  }
};

export const detectLaunchTarget = async (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: typeof fetch = fetch,
) => {
  if (env.VISUAL_AID_OPEN_COMMAND) {
    return {
      kind: "command",
      value: env.VISUAL_AID_OPEN_COMMAND,
      source: "VISUAL_AID_OPEN_COMMAND",
    } satisfies LaunchTarget;
  }

  if (env.VISUAL_AID_APP_PATH) {
    return {
      kind: "bundle",
      value: env.VISUAL_AID_APP_PATH,
      source: "VISUAL_AID_APP_PATH",
    } satisfies LaunchTarget;
  }

  const canonicalDogfoodSessionSuffix = normalize(
    join(".visual-aid", "dev-session.json"),
  );
  const prefersDebugBinary =
    env.VISUAL_AID_PREFER_DEBUG_APP === "1" ||
    typeof env.VISUAL_AID_SESSION_PATH === "string" &&
    normalize(env.VISUAL_AID_SESSION_PATH).endsWith(canonicalDogfoodSessionSuffix);
  const canUseDebugBinary =
    prefersDebugBinary && await isDebugAppReachable(fetchImpl);

  const releaseCandidates: LaunchTarget[] = [
    {
      kind: "bundle",
      value: join(
        cwd,
        "src-tauri",
        "target",
        "release",
        "bundle",
        "macos",
        "visual-aid.app",
      ),
      source: "detected release app bundle",
    },
    {
      kind: "binary",
      value: join(cwd, "src-tauri", "target", "release", "visual-aid"),
      source: "detected release binary",
    },
    {
      kind: "binary",
      value: join(cwd, "src-tauri", "target", "debug", "visual-aid"),
      source: "detected debug binary",
    },
  ];
  const candidates = canUseDebugBinary
    ? [releaseCandidates[2], releaseCandidates[0], releaseCandidates[1]]
    : releaseCandidates.slice(0, 2);

  for (const candidate of candidates) {
    try {
      await access(candidate.value);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
};

export const launchTarget = (
  target: LaunchTarget,
  spawnImpl: typeof spawn = spawn,
) => {
  if (target.kind === "command") {
    spawnImpl(target.value, {
      detached: true,
      shell: true,
      stdio: "ignore",
    }).unref();

    return;
  }

  if (target.kind === "bundle") {
    spawnImpl("open", [target.value], {
      detached: true,
      stdio: "ignore",
    }).unref();

    return;
  }

  spawnImpl(target.value, {
    detached: true,
    stdio: "ignore",
  }).unref();
};

export const maybeLaunchApp = async (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
  spawnImpl: typeof spawn = spawn,
) => {
  const target = await detectLaunchTarget(cwd, env);

  if (!target) {
    return null;
  }

  launchTarget(target, spawnImpl);
  return target;
};
