import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import type { VisualAidSession } from "./session.js";

export type VisualAidWorkspace = {
  id: string;
  cwd: string;
  label: string;
  sessionPath: string;
  session: VisualAidSession;
};

export type VisualAidWorkspaceState = {
  activeWorkspaceId: string | null;
  workspaces: VisualAidWorkspace[];
};

export const emptyWorkspaceState = (): VisualAidWorkspaceState => ({
  activeWorkspaceId: null,
  workspaces: [],
});

export const workspaceIdForCwd = (cwd: string) => cwd;

export const workspaceLabelForCwd = (cwd: string) => basename(cwd) || cwd;

export const resolveWorkspaceCwd = (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
) => {
  if (env.VISUAL_AID_WORKSPACE_CWD) {
    return env.VISUAL_AID_WORKSPACE_CWD;
  }

  if (cwd !== "/") {
    return cwd;
  }

  const shellCwd = env.PWD ?? env.INIT_CWD;

  if (shellCwd && shellCwd !== "/") {
    return shellCwd;
  }

  return cwd;
};

export const resolveRegistryPath = (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
) =>
  env.VISUAL_AID_REGISTRY_PATH ??
  join(env.HOME ?? env.USERPROFILE ?? cwd, ".visual-aid", "registry.json");

export const readWorkspaceState = async (
  registryPath: string,
): Promise<VisualAidWorkspaceState> => {
  try {
    const raw = await readFile(registryPath, "utf8");
    return JSON.parse(raw) as VisualAidWorkspaceState;
  } catch {
    return emptyWorkspaceState();
  }
};

export const writeWorkspaceState = async (
  registryPath: string,
  workspaceState: VisualAidWorkspaceState,
) => {
  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(registryPath, JSON.stringify(workspaceState, null, 2));
};

export const applyWorkspaceSession = (
  workspaceState: VisualAidWorkspaceState,
  cwd: string,
  sessionPath: string,
  session: VisualAidSession,
): VisualAidWorkspaceState => {
  const workspaceId = workspaceIdForCwd(cwd);
  const workspace = {
    id: workspaceId,
    cwd,
    label: workspaceLabelForCwd(cwd),
    sessionPath,
    session,
  };
  const existingIndex = workspaceState.workspaces.findIndex(
    (entry) => entry.id === workspaceId,
  );

  if (existingIndex === -1) {
    return {
      activeWorkspaceId: workspaceId,
      workspaces: [...workspaceState.workspaces, workspace],
    };
  }

  const workspaces = workspaceState.workspaces.slice();
  workspaces[existingIndex] = workspace;

  return {
    activeWorkspaceId: workspaceId,
    workspaces,
  };
};
