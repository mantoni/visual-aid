import { z } from "zod";

export const visualAidFormatSchema = z.enum([
  "markdown",
  "json",
  "diff",
  "mermaid",
  "excalidraw",
  "html",
]);

export const visualAidModeSchema = z.enum(["replace", "append"]).optional();

export const visualAidPayloadSchema = z.object({
  version: z.literal(1),
  format: visualAidFormatSchema,
  content: z.string(),
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  mode: visualAidModeSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type VisualAidPayload = z.infer<typeof visualAidPayloadSchema>;
