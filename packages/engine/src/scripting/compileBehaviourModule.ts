import { Behaviour, type BehaviourConstructor } from "./Behaviour.js";

export interface CompileBehaviourResult {
  ok: true;
  ctor: BehaviourConstructor;
}

export interface CompileBehaviourError {
  ok: false;
  message: string;
}

export type CompileBehaviourOutcome = CompileBehaviourResult | CompileBehaviourError;

/**
 * Compile a Behaviour TypeScript source string into a constructor.
 * Strips types / imports and evaluates against a sandbox that only exposes Behaviour.
 * Scripts must `export default class X extends Behaviour`.
 */
export function compileBehaviourModule(
  source: string,
  modulePath = "scripts/unknown.ts"
): CompileBehaviourOutcome {
  try {
    const body = transpileBehaviourSource(source);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- intentional sandboxed script compile
    const factory = new Function(
      "Behaviour",
      `"use strict";\n${body}\n` +
        `if (typeof __arcforge_default__ !== "function") {\n` +
        `  throw new Error("Script must export default a Behaviour class");\n` +
        `}\n` +
        `return __arcforge_default__;`
    ) as (BehaviourBase: typeof Behaviour) => BehaviourConstructor;

    const ctor = factory(Behaviour);
    if (typeof ctor !== "function") {
      return { ok: false, message: `${modulePath}: default export is not a constructor` };
    }

    // Smoke-construct to catch obvious runtime errors early.
    try {
      const instance = new ctor();
      if (!(instance instanceof Behaviour)) {
        return {
          ok: false,
          message: `${modulePath}: default export must extend Behaviour`,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, message: `${modulePath}: construct failed: ${message}` };
    }

    return { ok: true, ctor };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `${modulePath}: ${message}` };
  }
}

/** Strip TS-only syntax enough for `new Function` evaluation in the browser. */
export function transpileBehaviourSource(source: string): string {
  let code = source;

  // Remove import lines (engine APIs are injected).
  code = code.replace(/^\s*import\s+[\s\S]*?from\s+["'][^"']+["']\s*;?\s*$/gm, "");
  code = code.replace(/^\s*import\s+["'][^"']+["']\s*;?\s*$/gm, "");

  // export default class → class + capture
  code = code.replace(
    /\bexport\s+default\s+class\s+([A-Za-z_][\w]*)/g,
    "class $1"
  );
  // Remember last default class name via a second pass
  const defaultClass = /\bexport\s+default\s+class\s+([A-Za-z_][\w]*)/.exec(source);
  const className = defaultClass?.[1];

  // export type / interface / type aliases
  code = code.replace(/^\s*export\s+type\s+[^=\n]+=\s*[^;]+;?\s*$/gm, "");
  code = code.replace(/^\s*type\s+[^=\n]+=\s*[^;]+;?\s*$/gm, "");
  code = code.replace(/^\s*export\s+interface\s+[\s\S]*?\{[\s\S]*?\}\s*/gm, "");
  code = code.replace(/^\s*interface\s+[\s\S]*?\{[\s\S]*?\}\s*/gm, "");

  // Remaining export keywords on declarations
  code = code.replace(/\bexport\s+(class|function|const|let|var|enum)\b/g, "$1");

  // Access modifiers
  code = code.replace(/\b(public|private|protected|readonly)\s+/g, "");

  // definite assignment
  code = code.replace(/!(?=\s*[=;,\n)])/g, "");

  // Strip parameter / property type annotations (heuristic).
  code = stripTypeAnnotations(code);

  // `as Type` / `satisfies Type` — strip until comma/semicolon/paren/brace/newline
  code = code.replace(/\b(?:as|satisfies)\s+[^,;)\n]+/g, "");

  if (className) {
    code += `\nvar __arcforge_default__ = ${className};\n`;
  } else {
    throw new Error("Could not find `export default class`");
  }

  return code;
}

function stripTypeAnnotations(code: string): string {
  // Return types on methods/functions: ) : Type {
  let out = code.replace(/\)\s*:\s*[A-Za-z_({[?][^;{\n]*(?=\s*\{)/g, ")");

  // Class fields: name: Type =  / name: Type;
  // Require the annotation to start with a type-like token (not a number / minus).
  out = out.replace(
    /(\n\s*[A-Za-z_][\w]*)\s*:\s*(?=[A-Za-z_({["'])[^=;\n]+(?=\s*[=;])/g,
    "$1"
  );

  // Params: (name: Type, name?: Type) — do not match object literals like `{ x: 0, z: -20 }`.
  out = out.replace(
    /(\(|,\s*)([A-Za-z_][\w]*)\??\s*:\s*(?=[A-Za-z_({["'])[^,)=]+(?=\s*[,)=])/g,
    "$1$2"
  );

  // Optional params marker left as name?
  out = out.replace(/(\(|,\s*)([A-Za-z_][\w]*)\?(?=\s*[,)=])/g, "$1$2");

  return out;
}
