import { z } from "zod";

export const ScriptModulePathSchema = z
  .string()
  .min(1)
  .regex(/^scripts\/.+\.ts$/, {
    message: "Script modules must live under scripts/ and end with .ts",
  });

export type ScriptModulePath = z.infer<typeof ScriptModulePathSchema>;

export function parseScriptModulePath(path: string): ScriptModulePath {
  return ScriptModulePathSchema.parse(path);
}
