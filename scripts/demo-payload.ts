import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const runtimeDir = join(process.cwd(), ".visual-aid");
const sessionPath =
  process.env.VISUAL_AID_SESSION_PATH ?? join(runtimeDir, "session.json");

const now = new Date().toISOString();

const session = {
  openedAt: now,
  lastAction: "show",
  updatedAt: now,
  items: [
    {
      version: 1,
      format: "markdown",
      title: "Demo Payload",
      summary:
        "A sample payload written directly to the visual-aid session file.",
      content: [
        "# visual-aid demo",
        "",
        "This payload was written by `npm run demo:payload`.",
        "",
        "- transport: file bridge",
        "- mode: replace",
        "- next step: replace this with a real MCP call",
      ].join("\n"),
      mode: "replace",
      metadata: {
        source: "demo-script",
        writtenAt: now,
      },
    },
    {
      version: 1,
      format: "diff",
      title: "Unified Diff Example",
      summary: "A second payload to exercise append mode and history.",
      content: [
        "--- a/src/example.ts",
        "+++ b/src/example.ts",
        "@@ -1,2 +1,4 @@",
        " export const status = 'pending';",
        "+export const format = 'markdown';",
        "+export const mode = 'append';",
      ].join("\n"),
      mode: "append",
      metadata: {
        source: "demo-script",
      },
    },
  ],
};

await mkdir(runtimeDir, { recursive: true });
await writeFile(sessionPath, JSON.stringify(session, null, 2));

console.log(`Wrote demo session to ${sessionPath}`);
