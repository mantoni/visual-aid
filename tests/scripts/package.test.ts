import mcpPackageJson from "../../packages/visual-aid/package.json";

import { describe, expect, it } from "vitest";

describe("standalone MCP package", () => {
  it("VMP-PACK-001 standalone MCP package uses the visual-aid npm identity", () => {
    expect(mcpPackageJson.name).toBe("visual-aid");
    expect(mcpPackageJson.bin).toEqual({
      "visual-aid": "./dist/server.js",
    });
  });

  it("VMP-PACK-002 standalone MCP package publishes only the built MCP payload", () => {
    expect(mcpPackageJson.files).toEqual(["dist", "README.md"]);
    expect(mcpPackageJson.dependencies).toEqual({
      "@modelcontextprotocol/sdk": "*",
      zod: "*",
    });
  });
});
