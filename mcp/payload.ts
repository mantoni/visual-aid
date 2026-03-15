import { z } from "zod";

export const visualAidFormatSchema = z.enum([
  "markdown",
  "code",
  "json",
  "diff",
  "mermaid",
  "html",
]);

export const visualAidModeSchema = z.enum(["replace", "append"]).optional();
export const visualAidPresentationSchema = z
  .enum(["default", "wireframe"])
  .optional();

export const visualAidPayloadSchema = z.object({
  version: z.literal(1),
  format: visualAidFormatSchema,
  content: z.string(),
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  language: z.string().min(1).optional(),
  presentation: visualAidPresentationSchema,
  mode: visualAidModeSchema,
}).strict();

export const visualAidWorkspaceOverrideSchema = z.object({
  cwd: z.string().min(1).optional(),
}).strict();

export const visualAidShowArgumentsSchema = visualAidPayloadSchema.extend({
  cwd: z.string().min(1).optional(),
}).strict();

export type VisualAidPayload = z.infer<typeof visualAidPayloadSchema>;
export type VisualAidShowArguments = z.infer<
  typeof visualAidShowArgumentsSchema
>;
