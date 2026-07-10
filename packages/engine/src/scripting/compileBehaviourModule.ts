import * as THREE from "three";
import ts from "typescript";
import { Behaviour, type BehaviourConstructor } from "./Behaviour.js";
import type { RuntimeSystem } from "../plugins/RuntimeExtensions.js";

export interface CompileBehaviourResult {
  ok: true;
  ctor: BehaviourConstructor;
}

export interface CompileBehaviourError {
  ok: false;
  message: string;
}

export type CompileBehaviourOutcome = CompileBehaviourResult | CompileBehaviourError;

export interface BehaviourModuleSource {
  path: string;
  source: string;
}

export interface CompileBehaviourModulesResult {
  modules: Record<string, BehaviourConstructor>;
  diagnostics: string[];
  systems: RuntimeSystem[];
}

export interface CompileBehaviourModulesOptions {
  externals?: Record<string, unknown>;
}

interface RuntimeModule {
  exports: Record<string, unknown>;
  evaluating: boolean;
  evaluated: boolean;
}

/** Compile one standalone Behaviour module. */
export function compileBehaviourModule(
  source: string,
  modulePath = "scripts/unknown.ts"
): CompileBehaviourOutcome {
  const result = compileBehaviourModules([{ path: modulePath, source }]);
  const ctor = result.modules[normalizeModulePath(modulePath)];
  if (ctor) return { ok: true, ctor };
  return {
    ok: false,
    message:
      result.diagnostics[0] ?? `${modulePath}: default export must be a class extending Behaviour`,
  };
}

/**
 * Compile a project script graph with the TypeScript compiler.
 * Relative imports, shared helper modules, @arcforge/engine, and three are supported.
 */
export function compileBehaviourModules(
  sources: BehaviourModuleSource[],
  options: CompileBehaviourModulesOptions = {}
): CompileBehaviourModulesResult {
  const compiled = new Map<string, string>();
  const diagnostics: string[] = [];
  for (const source of sources) {
    const modulePath = normalizeModulePath(source.path);
    const result = transpile(source.source, modulePath);
    compiled.set(modulePath, result.outputText);
    diagnostics.push(...result.diagnostics);
  }

  const cache = new Map<string, RuntimeModule>();
  const externalModules: Record<string, unknown> = {
    "@arcforge/engine": { Behaviour },
    three: THREE,
    ...options.externals,
  };

  const evaluate = (modulePath: string): RuntimeModule => {
    const normalized = normalizeModulePath(modulePath);
    const existing = cache.get(normalized);
    if (existing) return existing;
    const code = compiled.get(normalized);
    if (code === undefined) throw new Error(`Module not found: ${normalized}`);

    const module: RuntimeModule = { exports: {}, evaluating: true, evaluated: false };
    cache.set(normalized, module);
    const requireModule = (specifier: string): unknown => {
      if (specifier in externalModules) return externalModules[specifier];
      const resolved = resolveProjectImport(normalized, specifier, compiled);
      if (!resolved)
        throw new Error(`${normalized}: unresolved import ${JSON.stringify(specifier)}`);
      return evaluate(resolved).exports;
    };

    try {
      const run = new Function(
        "require",
        "module",
        "exports",
        `"use strict";\n${code}\n//# sourceURL=arcforge://${normalized}`
      ) as (
        require: (specifier: string) => unknown,
        module: RuntimeModule,
        exports: Record<string, unknown>
      ) => void;
      run(requireModule, module, module.exports);
      module.evaluating = false;
      module.evaluated = true;
      return module;
    } catch (error) {
      cache.delete(normalized);
      throw error;
    }
  };

  const modules: Record<string, BehaviourConstructor> = {};
  const systems: RuntimeSystem[] = [];
  for (const modulePath of compiled.keys()) {
    try {
      const evaluated = evaluate(modulePath);
      const candidate = evaluated.exports.default;
      if (candidate === undefined) continue;
      if (isBehaviourConstructor(candidate)) modules[modulePath] = candidate;
      else if (isRuntimeSystem(candidate)) systems.push(candidate);
      else
        diagnostics.push(
          `${modulePath}: default export must be a Behaviour class or RuntimeSystem`
        );
    } catch (error) {
      diagnostics.push(`${modulePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { modules, systems, diagnostics: [...new Set(diagnostics)] };
}

/** Real TypeScript transpilation retained as a debugging/public compatibility helper. */
export function transpileBehaviourSource(
  source: string,
  modulePath = "scripts/unknown.ts"
): string {
  return transpile(source, modulePath).outputText;
}

function transpile(
  source: string,
  modulePath: string
): { outputText: string; diagnostics: string[] } {
  const result = ts.transpileModule(source, {
    fileName: modulePath,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10,
      esModuleInterop: true,
      strict: true,
      sourceMap: false,
    },
  });
  return {
    outputText: result.outputText,
    diagnostics: (result.diagnostics ?? []).map((diagnostic) =>
      formatDiagnostic(modulePath, diagnostic)
    ),
  };
}

function resolveProjectImport(
  importer: string,
  specifier: string,
  modules: Map<string, string>
): string | null {
  if (!specifier.startsWith(".")) return null;
  const slash = importer.lastIndexOf("/");
  const directory = slash >= 0 ? importer.slice(0, slash + 1) : "";
  const base = normalizeModulePath(`${directory}${specifier}`);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  return candidates.find((candidate) => modules.has(candidate)) ?? null;
}

function normalizeModulePath(modulePath: string): string {
  const parts: string[] = [];
  for (const part of modulePath.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function isBehaviourConstructor(value: unknown): value is BehaviourConstructor {
  if (typeof value !== "function") return false;
  try {
    return new (value as BehaviourConstructor)() instanceof Behaviour;
  } catch {
    return false;
  }
}

function isRuntimeSystem(value: unknown): value is RuntimeSystem {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof (value as { id: unknown }).id === "string"
  );
}

function formatDiagnostic(modulePath: string, diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (diagnostic.start === undefined || !diagnostic.file) return `${modulePath}: ${message}`;
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${modulePath}:${position.line + 1}:${position.character + 1}: ${message}`;
}
