import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const VERSION_FILE_PATHS = {
  packageJson: "package.json",
  mcpPackageJson: join("packages", "visual-aid", "package.json"),
  tauriConfig: join("src-tauri", "tauri.conf.json"),
  cargoToml: join("src-tauri", "Cargo.toml"),
} as const;

export const updatePackageJsonVersion = (content: string, version: string) => {
  const parsed = JSON.parse(content) as { version?: unknown };

  if (typeof parsed.version !== "string") {
    throw new Error("Could not find package version in package.json");
  }

  parsed.version = version;

  return `${JSON.stringify(parsed, null, 2)}\n`;
};

export const parsePackageVersion = (content: string) => {
  const version = JSON.parse(content).version;

  if (typeof version !== "string") {
    throw new Error("Could not find package version in package.json");
  }

  return version;
};

export const updateCargoPackageVersion = (content: string, version: string) => {
  const next = content.replace(
    /(\[package\][\s\S]*?^version\s*=\s*")([^"]+)(")/m,
    `$1${version}$3`,
  );

  if (next === content) {
    throw new Error("Could not update package version in src-tauri/Cargo.toml");
  }

  return next;
};

export const updateTauriConfigVersion = (content: string, version: string) => {
  const parsed = JSON.parse(content) as { version?: unknown };

  if (typeof parsed.version !== "string") {
    throw new Error("Could not find package version in src-tauri/tauri.conf.json");
  }

  parsed.version = version;

  return `${JSON.stringify(parsed, null, 2)}\n`;
};

export const syncRepositoryVersionFiles = async (cwd = process.cwd()) => {
  const packageJsonPath = join(cwd, VERSION_FILE_PATHS.packageJson);
  const mcpPackageJsonPath = join(cwd, VERSION_FILE_PATHS.mcpPackageJson);
  const tauriConfigPath = join(cwd, VERSION_FILE_PATHS.tauriConfig);
  const cargoTomlPath = join(cwd, VERSION_FILE_PATHS.cargoToml);

  const [packageJsonRaw, mcpPackageJsonRaw, tauriConfigRaw, cargoTomlRaw] = await Promise.all([
    readFile(packageJsonPath, "utf8"),
    readFile(mcpPackageJsonPath, "utf8"),
    readFile(tauriConfigPath, "utf8"),
    readFile(cargoTomlPath, "utf8"),
  ]);

  const version = parsePackageVersion(packageJsonRaw);
  const nextMcpPackageJson = updatePackageJsonVersion(mcpPackageJsonRaw, version);
  const nextTauriConfig = updateTauriConfigVersion(tauriConfigRaw, version);
  const nextCargoToml = updateCargoPackageVersion(cargoTomlRaw, version);

  await Promise.all([
    writeFile(mcpPackageJsonPath, nextMcpPackageJson, "utf8"),
    writeFile(tauriConfigPath, nextTauriConfig, "utf8"),
    writeFile(cargoTomlPath, nextCargoToml, "utf8"),
  ]);

  return {
    version,
    updatedFiles: [
      VERSION_FILE_PATHS.mcpPackageJson,
      VERSION_FILE_PATHS.tauriConfig,
      VERSION_FILE_PATHS.cargoToml,
    ],
  };
};

export const runVersionSync = async ({
  cwd = process.cwd(),
  stdout = process.stdout,
}: {
  cwd?: string;
  stdout?: Pick<NodeJS.WriteStream, "write">;
} = {}) => {
  const result = await syncRepositoryVersionFiles(cwd);

  stdout.write(
    `Synced release version ${result.version} to ${result.updatedFiles.join(", ")}\n`,
  );

  return 0;
};

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runVersionSync().then(
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
