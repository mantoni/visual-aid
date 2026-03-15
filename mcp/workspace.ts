import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

export type VisualAidWorkspaceRegistryEntry = {
  id: string;
  cwd: string;
  label: string;
  sessionPath: string;
};

export type VisualAidWorkspaceRegistryState = {
  activeWorkspaceId: string | null;
  workspaces: VisualAidWorkspaceRegistryEntry[];
};

export const emptyWorkspaceRegistryState = (): VisualAidWorkspaceRegistryState => ({
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
): Promise<VisualAidWorkspaceRegistryState> => {
  try {
    const raw = await readFile(registryPath, "utf8");
    return JSON.parse(raw) as VisualAidWorkspaceRegistryState;
  } catch {
    return emptyWorkspaceRegistryState();
  }
};

export const writeWorkspaceState = async (
  registryPath: string,
  workspaceState: VisualAidWorkspaceRegistryState,
) => {
  await mkdir(dirname(registryPath), { recursive: true });
  await writeFile(registryPath, JSON.stringify(workspaceState, null, 2));
};

export const applyWorkspaceSession = (
  workspaceState: VisualAidWorkspaceRegistryState,
  cwd: string,
  sessionPath: string,
): VisualAidWorkspaceRegistryState => {
  const workspaceId = workspaceIdForCwd(cwd);
  const workspace = {
    id: workspaceId,
    cwd,
    label: workspaceLabelForCwd(cwd),
    sessionPath,
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
