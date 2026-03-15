import { describe, expect, it } from "vitest";

import {
  RELEASE_PLATFORMS,
  createReleasePlan,
  formatReleasePlan,
  parseCargoVersion,
  parseReleaseArgs,
  resolveReleaseVersion,
} from "../../scripts/release.js";

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
    expect(plan.releaseName).toBe("visual-aid v0.1.0");
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
});
