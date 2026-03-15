import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type ReleasePlatformId = "macos" | "linux" | "windows";

export type ReleasePlatformPlan = {
  id: ReleasePlatformId;
  runner: string;
  bundleTargets: string[];
  assetGlobs: string[];
};

export type ReleasePlan = {
  version: string;
  tag: string;
  releaseName: string;
  draft: boolean;
  prerelease: boolean;
  platforms: ReleasePlatformPlan[];
};

const VERSION_FILE_PATHS = {
  packageJson: "package.json",
  mcpPackageJson: join("packages", "visual-aid", "package.json"),
  tauriConfig: join("src-tauri", "tauri.conf.json"),
  cargoToml: join("src-tauri", "Cargo.toml"),
} as const;

export const RELEASE_PLATFORMS: ReleasePlatformPlan[] = [
  {
    id: "macos",
    runner: "macos-latest",
    bundleTargets: ["dmg"],
    assetGlobs: [join("src-tauri", "target", "release", "bundle", "dmg", "*.dmg")],
  },
  {
    id: "linux",
    runner: "ubuntu-22.04",
    bundleTargets: ["appimage", "deb", "rpm"],
    assetGlobs: [
      join("src-tauri", "target", "release", "bundle", "appimage", "*.AppImage"),
      join("src-tauri", "target", "release", "bundle", "deb", "*.deb"),
      join("src-tauri", "target", "release", "bundle", "rpm", "*.rpm"),
    ],
  },
  {
    id: "windows",
    runner: "windows-latest",
    bundleTargets: ["msi", "nsis"],
    assetGlobs: [
      join("src-tauri", "target", "release", "bundle", "msi", "*.msi"),
      join("src-tauri", "target", "release", "bundle", "nsis", "*.exe"),
    ],
  },
];

const normalizeVersion = (value: string) => value.trim().replace(/^v/, "");

const versionTag = (version: string) => `v${normalizeVersion(version)}`;

export const parseCargoVersion = (content: string) => {
  const match = content.match(/^version\s*=\s*"([^"]+)"/m);

  if (!match) {
    throw new Error("Could not find package version in src-tauri/Cargo.toml");
  }

  return match[1];
};

export const readRepositoryVersion = async (cwd = process.cwd()) => {
  const [packageJsonRaw, mcpPackageJsonRaw, tauriConfigRaw, cargoTomlRaw] = await Promise.all([
    readFile(join(cwd, VERSION_FILE_PATHS.packageJson), "utf8"),
    readFile(join(cwd, VERSION_FILE_PATHS.mcpPackageJson), "utf8"),
    readFile(join(cwd, VERSION_FILE_PATHS.tauriConfig), "utf8"),
    readFile(join(cwd, VERSION_FILE_PATHS.cargoToml), "utf8"),
  ]);

  const packageVersion = JSON.parse(packageJsonRaw).version;
  const mcpPackageVersion = JSON.parse(mcpPackageJsonRaw).version;
  const tauriVersion = JSON.parse(tauriConfigRaw).version;
  const cargoVersion = parseCargoVersion(cargoTomlRaw);

  if (
    typeof packageVersion !== "string" ||
    typeof mcpPackageVersion !== "string" ||
    typeof tauriVersion !== "string" ||
    typeof cargoVersion !== "string"
  ) {
    throw new Error("Release version metadata must be strings in all tracked files");
  }

  const versions = [
    packageVersion,
    mcpPackageVersion,
    tauriVersion,
    cargoVersion,
  ].map(normalizeVersion);
  const [firstVersion] = versions;

  if (!versions.every((version) => version === firstVersion)) {
    throw new Error(
      `Release version mismatch: package.json=${packageVersion}, packages/visual-aid/package.json=${mcpPackageVersion}, src-tauri/tauri.conf.json=${tauriVersion}, src-tauri/Cargo.toml=${cargoVersion}`,
    );
  }

  return firstVersion;
};

export const resolveReleaseVersion = ({
  repositoryVersion,
  requestedVersion,
  githubRef,
}: {
  repositoryVersion: string;
  requestedVersion?: string;
  githubRef?: string;
}) => {
  const normalizedRepositoryVersion = normalizeVersion(repositoryVersion);
  const tagVersion = githubRef?.startsWith("refs/tags/")
    ? normalizeVersion(githubRef.slice("refs/tags/".length))
    : undefined;
  const normalizedRequestedVersion = requestedVersion
    ? normalizeVersion(requestedVersion)
    : undefined;
  const resolvedVersion =
    normalizedRequestedVersion ?? tagVersion ?? normalizedRepositoryVersion;

  if (resolvedVersion !== normalizedRepositoryVersion) {
    throw new Error(
      `Requested release version ${resolvedVersion} does not match repository version ${normalizedRepositoryVersion}`,
    );
  }

  if (tagVersion && tagVersion !== normalizedRepositoryVersion) {
    throw new Error(
      `Git tag ${versionTag(tagVersion)} does not match repository version ${normalizedRepositoryVersion}`,
    );
  }

  return normalizedRepositoryVersion;
};

export const createReleasePlan = ({
  version,
  draft = false,
  prerelease = false,
}: {
  version: string;
  draft?: boolean;
  prerelease?: boolean;
}): ReleasePlan => ({
  version: normalizeVersion(version),
  tag: versionTag(version),
  releaseName: `Visual AId v${normalizeVersion(version)}`,
  draft,
  prerelease,
  platforms: RELEASE_PLATFORMS,
});

export const parseReleaseArgs = (args: readonly string[]) => {
  const result: {
    version?: string;
    draft: boolean;
    prerelease: boolean;
    json: boolean;
    githubRef?: string;
  } = {
    draft: false,
    prerelease: false,
    json: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--draft") {
      result.draft = true;
      continue;
    }

    if (argument === "--prerelease") {
      result.prerelease = true;
      continue;
    }

    if (argument === "--json") {
      result.json = true;
      continue;
    }

    if (argument === "--version") {
      result.version = args[index + 1];
      index += 1;
      continue;
    }

    if (argument === "--github-ref") {
      result.githubRef = args[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown release argument: ${argument}`);
  }

  return result;
};

export const formatReleasePlan = (plan: ReleasePlan) =>
  [
    `${plan.releaseName}`,
    `Tag: ${plan.tag}`,
    `Draft: ${plan.draft ? "yes" : "no"}`,
    `Pre-release: ${plan.prerelease ? "yes" : "no"}`,
    "Platforms:",
    ...plan.platforms.map(
      (platform) =>
        `- ${platform.id}: ${platform.bundleTargets.join(", ")} on ${platform.runner}`,
    ),
  ].join("\n");

export const runReleasePlanner = async ({
  args = process.argv.slice(2),
  cwd = process.cwd(),
  stdout = process.stdout,
}: {
  args?: readonly string[];
  cwd?: string;
  stdout?: Pick<NodeJS.WriteStream, "write">;
} = {}) => {
  const options = parseReleaseArgs(args);
  const repositoryVersion = await readRepositoryVersion(cwd);
  const version = resolveReleaseVersion({
    repositoryVersion,
    requestedVersion: options.version,
    githubRef: options.githubRef ?? process.env.GITHUB_REF,
  });
  const plan = createReleasePlan({
    version,
    draft: options.draft,
    prerelease: options.prerelease,
  });

  stdout.write(
    `${options.json ? JSON.stringify(plan, null, 2) : formatReleasePlan(plan)}\n`,
  );

  return 0;
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runReleasePlanner().then(
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
