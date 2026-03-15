import { z } from "zod";

export const visualAidFormatSchema = z.enum([
  "markdown",
  "code",
  "json",
  "diff",
  "mermaid",
  "html",
]).describe(
  "Renderer to use in the desktop app: markdown, code, json, diff, mermaid, or html.",
);

export const visualAidModeSchema = z
  .enum(["replace", "append"])
  .describe(
    "How to update the current workspace view: replace clears existing items first, append keeps them and replaces by id when one matches.",
  )
  .optional();
export const visualAidPresentationSchema = z
  .enum(["default", "wireframe"])
  .describe(
    "Optional renderer-owned presentation hint. Currently used for html payloads.",
  )
  .optional();

export const visualAidPayloadSchema = z
  .object({
    version: z.literal(1).describe("Payload schema version. The current version is 1."),
    format: visualAidFormatSchema,
    content: z
      .string()
      .describe("Raw content to render in the desktop app."),
    id: z
      .string()
      .min(1)
      .describe(
        "Optional stable item id. In append mode, a matching id updates the existing item instead of adding another one.",
      )
      .optional(),
    title: z
      .string()
      .min(1)
      .describe("Optional user-facing title shown above the rendered payload.")
      .optional(),
    summary: z
      .string()
      .min(1)
      .describe("Optional short summary shown alongside the rendered payload.")
      .optional(),
    language: z
      .string()
      .min(1)
      .describe(
        "Optional syntax-highlighting hint, mainly for code payloads such as typescript or rust.",
      )
      .optional(),
    presentation: visualAidPresentationSchema,
    mode: visualAidModeSchema,
  })
  .strict()
  .describe(
    "Structured payload for visual-aid.show. Use it to render visually inspectable artifacts in the Visual AId desktop app.",
  );

export const visualAidWorkspaceOverrideSchema = z
  .object({
    cwd: z
      .string()
      .min(1)
      .describe(
        "Optional workspace directory to target for this tool call. Visual AId stores one session per workspace.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "Optional workspace override for tools that act on the current Visual AId workspace session.",
  );

export const visualAidShowArgumentsSchema = visualAidPayloadSchema
  .extend({
    cwd: z
      .string()
      .min(1)
      .describe(
        "Optional workspace directory to target for this render request.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "Arguments for visual-aid.show. Render markdown, code, json, diff, mermaid, or html in the Visual AId desktop app.",
  );

export type VisualAidPayload = z.infer<typeof visualAidPayloadSchema>;
export type VisualAidShowArguments = z.infer<
  typeof visualAidShowArgumentsSchema
>;
