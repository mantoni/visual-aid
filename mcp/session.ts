import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { VisualAidPayload } from "./payload.js";

export type VisualAidSession = {
  openedAt: string | null;
  lastAction: "open" | "show" | "clear";
  updatedAt: string | null;
  items: VisualAidPayload[];
};

export const emptySession = (): VisualAidSession => ({
  openedAt: null,
  lastAction: "clear",
  updatedAt: null,
  items: [],
});

export const resolveSessionPath = (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
) => env.VISUAL_AID_SESSION_PATH ?? join(cwd, ".visual-aid", "session.json");

export const readSession = async (
  sessionPath: string,
): Promise<VisualAidSession> => {
  try {
    const raw = await readFile(sessionPath, "utf8");
    return JSON.parse(raw) as VisualAidSession;
  } catch {
    return emptySession();
  }
};

export const writeSession = async (
  sessionPath: string,
  session: VisualAidSession,
) => {
  await mkdir(dirname(sessionPath), { recursive: true });
  await writeFile(sessionPath, JSON.stringify(session, null, 2));
};

export const applyOpen = (session: VisualAidSession, now: string) => ({
  ...session,
  openedAt: session.openedAt ?? now,
  lastAction: "open" as const,
  updatedAt: now,
});

export const applyShow = (
  session: VisualAidSession,
  payload: VisualAidPayload,
  now: string,
) => ({
  openedAt: session.openedAt,
  lastAction: "show" as const,
  updatedAt: now,
  items: payload.mode === "append" ? [...session.items, payload] : [payload],
});

export const applyClear = (session: VisualAidSession, now: string) => ({
  ...session,
  lastAction: "clear" as const,
  updatedAt: now,
  items: [],
});
