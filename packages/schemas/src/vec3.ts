import { z } from "zod";
import type { Vec3 } from "./types.js";

export function vec3(defaultValue: Vec3 = [0, 0, 0]) {
  return z.tuple([z.number(), z.number(), z.number()]).default(defaultValue);
}
