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

export type VisualAidWorkspaceResolutionSource =
  | "explicit-override"
  | "process-cwd";

export type VisualAidWorkspaceResolution = {
  cwd: string;
  source: VisualAidWorkspaceResolutionSource;
};

export const emptyWorkspaceRegistryState =
  (): VisualAidWorkspaceRegistryState => ({
    activeWorkspaceId: null,
    workspaces: [],
  });

export const workspaceIdForCwd = (cwd: string) => cwd;

export const workspaceLabelForCwd = (cwd: string) => basename(cwd) || cwd;

const resolveExplicitWorkspaceCwd = (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
) => {
  if (env.VISUAL_AID_WORKSPACE_CWD) {
    return env.VISUAL_AID_WORKSPACE_CWD;
  }

  return null;
};

export const resolveWorkspaceCwd = async (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
) => (await resolveWorkspace(cwd, env)).cwd;

export const resolveWorkspace = async (
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<VisualAidWorkspaceResolution> => {
  const explicitWorkspaceCwd = resolveExplicitWorkspaceCwd(cwd, env);

  if (explicitWorkspaceCwd) {
    return {
      cwd: explicitWorkspaceCwd,
      source: "explicit-override",
    };
  }

  return {
    cwd,
    source: "process-cwd",
  };
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
