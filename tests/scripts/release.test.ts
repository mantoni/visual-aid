import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it } from "vitest";

import {
  RELEASE_PLATFORMS,
  createReleasePlan,
  formatReleasePlan,
  parseCargoVersion,
  parseReleaseArgs,
  readRepositoryVersion,
  resolveReleaseVersion,
} from "../../scripts/release.js";
import rootPackageJson from "../../package.json";
import {
  runVersionSync,
  syncRepositoryVersionFiles,
  updatePackageJsonVersion,
  updateCargoPackageVersion,
} from "../../scripts/version.js";

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

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map((root) =>
      rm(root, { recursive: true, force: true }),
    ),
  );
});

describe("release planning", () => {
  it("VRD-BUILD-001 release automation plans versioned artifacts for each supported platform", () => {
    const plan = createReleasePlan({ version: "0.1.0" });

    expect(plan.tag).toBe("v0.1.0");
    expect(plan.platforms).toEqual(RELEASE_PLATFORMS);
    expect(plan.platforms.map((platform) => platform.id)).toEqual([
      "macos",
      "linux",
      "windows",
    ]);
    expect(plan.platforms.find((platform) => platform.id === "macos")?.assetGlobs).toEqual([
      "src-tauri/target/release/bundle/dmg/*.dmg",
    ]);
  });

  it("VRD-PUBLISH-001 tagged releases publish installers to GitHub Releases", () => {
    const version = resolveReleaseVersion({
      repositoryVersion: "0.1.0",
      githubRef: "refs/tags/v0.1.0",
    });
    const plan = createReleasePlan({ version });

    expect(version).toBe("0.1.0");
    expect(plan.releaseName).toBe("Visual AId v0.1.0");
    expect(formatReleasePlan(plan)).toContain("Tag: v0.1.0");
  });

  it("VRD-PUBLISH-002 manual release runs can stage a draft or pre-release", () => {
    const options = parseReleaseArgs([
      "--version",
      "0.1.0",
      "--draft",
      "--prerelease",
      "--json",
    ]);
    const version = resolveReleaseVersion({
      repositoryVersion: "0.1.0",
      requestedVersion: options.version,
    });
    const plan = createReleasePlan({
      version,
      draft: options.draft,
      prerelease: options.prerelease,
    });

    expect(plan.draft).toBe(true);
    expect(plan.prerelease).toBe(true);
  });

  it("rejects version mismatches between the requested release and the repository", () => {
    expect(() =>
      resolveReleaseVersion({
        repositoryVersion: "0.1.0",
        requestedVersion: "0.2.0",
      }),
    ).toThrow("Requested release version 0.2.0 does not match repository version 0.1.0");
  });

  it("parses the package version from Cargo.toml", () => {
    expect(parseCargoVersion('[package]\nname = "visual-aid"\nversion = "0.1.0"\n')).toBe(
      "0.1.0",
    );
  });

  it("VRD-BUILD-002 VMP-VERSION-001 npm version keeps the standalone MCP package, Tauri, and Cargo versions aligned", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-aid-release-"));
    tempRoots.push(root);

    await mkdir(join(root, "src-tauri"), { recursive: true });
    await mkdir(join(root, "packages", "visual-aid"), { recursive: true });
    await Promise.all([
      writeFile(
        join(root, "package.json"),
        JSON.stringify({ name: "visual-aid", version: "1.2.3" }, null, 2),
        "utf8",
      ),
      writeFile(
        join(root, "packages", "visual-aid", "package.json"),
        JSON.stringify({ name: "visual-aid", version: "0.1.0" }, null, 2),
        "utf8",
      ),
      writeFile(
        join(root, "src-tauri", "tauri.conf.json"),
        `${JSON.stringify({ version: "0.1.0", productName: "Visual AId" }, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        join(root, "src-tauri", "Cargo.toml"),
        '[package]\nname = "visual-aid"\nversion = "0.1.0"\n',
        "utf8",
      ),
    ]);

    const result = await syncRepositoryVersionFiles(root);

    expect(result.version).toBe("1.2.3");
    expect(JSON.parse(await readFile(join(root, "packages", "visual-aid", "package.json"), "utf8"))).toMatchObject(
      { version: "1.2.3" },
    );
    expect(JSON.parse(await readFile(join(root, "src-tauri", "tauri.conf.json"), "utf8"))).toMatchObject(
      { version: "1.2.3" },
    );
    expect(parseCargoVersion(await readFile(join(root, "src-tauri", "Cargo.toml"), "utf8"))).toBe(
      "1.2.3",
    );
  });

  it("VRD-BUILD-002 VMP-VERSION-001 version sync reports the files it updated", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-aid-release-"));
    tempRoots.push(root);

    await mkdir(join(root, "src-tauri"), { recursive: true });
    await mkdir(join(root, "packages", "visual-aid"), { recursive: true });
    await Promise.all([
      writeFile(
        join(root, "package.json"),
        JSON.stringify({ name: "visual-aid", version: "2.0.0" }, null, 2),
        "utf8",
      ),
      writeFile(
        join(root, "packages", "visual-aid", "package.json"),
        JSON.stringify({ name: "visual-aid", version: "0.1.0" }, null, 2),
        "utf8",
      ),
      writeFile(
        join(root, "src-tauri", "tauri.conf.json"),
        `${JSON.stringify({ version: "0.1.0" }, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        join(root, "src-tauri", "Cargo.toml"),
        '[package]\nname = "visual-aid"\nversion = "0.1.0"\n',
        "utf8",
      ),
    ]);

    const stdout = createOutputBuffer();
    const exitCode = await runVersionSync({ cwd: root, stdout: stdout.output });

    expect(exitCode).toBe(0);
    expect(stdout.text()).toBe(
      "Synced release version 2.0.0 to packages/visual-aid/package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml\n",
    );
  });

  it("VRD-BUILD-002 npm version stages Cargo.lock when the Rust lockfile changes", () => {
    expect(rootPackageJson.scripts.version).toContain("src-tauri/Cargo.lock");
  });

  it("release planning rejects version mismatches from the standalone MCP package metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "visual-aid-release-"));
    tempRoots.push(root);

    await mkdir(join(root, "src-tauri"), { recursive: true });
    await mkdir(join(root, "packages", "visual-aid"), { recursive: true });
    await Promise.all([
      writeFile(
        join(root, "package.json"),
        JSON.stringify({ name: "visual-aid", version: "1.0.0" }, null, 2),
        "utf8",
      ),
      writeFile(
        join(root, "packages", "visual-aid", "package.json"),
        JSON.stringify({ name: "visual-aid", version: "2.0.0" }, null, 2),
        "utf8",
      ),
      writeFile(
        join(root, "src-tauri", "tauri.conf.json"),
        `${JSON.stringify({ version: "1.0.0" }, null, 2)}\n`,
        "utf8",
      ),
      writeFile(
        join(root, "src-tauri", "Cargo.toml"),
        '[package]\nname = "visual-aid"\nversion = "1.0.0"\n',
        "utf8",
      ),
    ]);

    await writeFile(
      join(root, "packages", "visual-aid", "package.json"),
      updatePackageJsonVersion(
        JSON.stringify({ name: "visual-aid", version: "2.0.0" }, null, 2),
        "2.0.0",
      ),
      "utf8",
    );

    await expect(readRepositoryVersion(root)).rejects.toThrow(
      "Release version mismatch: package.json=1.0.0, packages/visual-aid/package.json=2.0.0, src-tauri/tauri.conf.json=1.0.0, src-tauri/Cargo.toml=1.0.0",
    );
  });

  it("updates only the package version entry in Cargo.toml", () => {
    expect(
      updateCargoPackageVersion(
        [
          '[package]',
          'name = "visual-aid"',
          'version = "0.1.0"',
          '',
          '[dependencies]',
          'serde = { version = "1", features = ["derive"] }',
          '',
        ].join("\n"),
        "1.2.3",
      ),
    ).toContain('serde = { version = "1", features = ["derive"] }');
  });
});
