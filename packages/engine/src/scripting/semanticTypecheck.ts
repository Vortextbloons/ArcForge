import ts from "typescript";
import type { ScriptDiagnostic, ScriptSource } from "./typecheckScripts.js";

const RUNTIME_DECLARATIONS = `
interface Object {}
interface Function {}
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface IArguments { length: number; [index: number]: any }
interface String { readonly length: number; }
interface Number {}
interface Boolean {}
interface RegExp {}
interface SymbolConstructor { readonly iterator: unique symbol; }
declare var Symbol: SymbolConstructor;
interface IteratorResult<T> { done?: boolean; value: T; }
interface Iterator<T> { next(): IteratorResult<T>; }
interface Iterable<T> { [Symbol.iterator](): Iterator<T>; }
interface Array<T> extends Iterable<T> {
  readonly length: number;
  [index: number]: T;
  map<U>(callback: (value: T, index: number, array: T[]) => U): U[];
  filter(callback: (value: T, index: number, array: T[]) => unknown): T[];
  find(callback: (value: T, index: number, array: T[]) => unknown): T | undefined;
  forEach(callback: (value: T, index: number, array: T[]) => void): void;
  push(...items: T[]): number;
  pop(): T | undefined;
}
interface ReadonlyArray<T> { readonly length: number; readonly [index: number]: T; }
interface PromiseLike<T> { then<TResult>(onfulfilled?: (value: T) => TResult | PromiseLike<TResult>): PromiseLike<TResult>; }
interface Promise<T> extends PromiseLike<T> {}
interface PromiseConstructor { new <T>(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void): Promise<T>; resolve<T>(value: T): Promise<T>; }
declare var Promise: PromiseConstructor;
type PropertyKey = string | number | symbol;
type Record<K extends PropertyKey, T> = { [P in K]: T };
type Partial<T> = { [P in keyof T]?: T[P] };
type Readonly<T> = { readonly [P in keyof T]: T[P] };
declare const Math: any;
declare const JSON: any;
declare const Object: any;
declare const console: any;
declare function setTimeout(callback: (...args: any[]) => void, ms?: number): number;

declare module "@arcforge/engine" {
  export interface TransformHandle {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
    translate(x: number, y: number, z: number): void;
    setPosition(x: number, y: number, z: number): void;
    setRotation(x: number, y: number, z: number): void;
    lookAt(x: number, y: number, z: number): void;
  }
  export interface EntityHandle {
    readonly id: string; readonly name: string; readonly parent: string | null;
    readonly transform: TransformHandle;
    getComponent<T>(typeId: string): T | undefined;
    hasComponent(typeId: string): boolean;
  }
  export interface World {
    get(id: string): any;
    getComponent<T>(id: string, typeId: string): T | undefined;
    query(...typeIds: string[]): any[];
  }
  export class Behaviour {
    onStart(ctx: GameContext): void;
    update(ctx: GameContext): void;
    fixedUpdate(ctx: GameContext): void;
    onDestroy(ctx: GameContext): void;
  }
  export interface GameContext {
    [key: string]: any;
    time: { delta: number; elapsed: number; fixedDelta: number };
    entity: EntityHandle; entities: any; world: World; scene: any; input: any;
    events: { on(event: string, handler: (payload: unknown) => void): () => void; emit(event: string, payload?: unknown): void };
    debug: { info(message: string, meta?: Record<string, unknown>): void; warn(message: string, meta?: Record<string, unknown>): void; error(message: string, meta?: Record<string, unknown>): void };
    physics: any; assets: any; audio: any; animation: any;
    timers: any; storage: any; scenes: any; extensions: any; particles: any;
  }
  export interface RuntimeSystem {
    id: string;
    onRegister?(ctx: any): void;
    onSceneLoaded?(ctx: any): void;
    update?(ctx: any, time: any): void;
    fixedUpdate?(ctx: any, time: any): void;
    render?(ctx: any, time: any): void;
    dispose?(ctx: any): void;
  }
  export type RuntimeRenderAdapter<T = unknown> = any;
}
declare module "three";
`;

/** Semantic TypeScript checking over an in-memory project module graph. */
export function semanticTypecheck(scripts: ScriptSource[]): ScriptDiagnostic[] {
  const files = new Map<string, string>();
  for (const script of scripts) files.set(toVirtualPath(script.path), script.source);
  files.set("/arcforge-runtime.d.ts", RUNTIME_DECLARATIONS);

  const options: ts.CompilerOptions = {
    noEmit: true,
    noLib: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    skipLibCheck: true,
  };
  const host: ts.CompilerHost = {
    getSourceFile(fileName, languageVersion) {
      const source = files.get(normalizeVirtualPath(fileName));
      return source === undefined
        ? undefined
        : ts.createSourceFile(fileName, source, languageVersion, true);
    },
    getDefaultLibFileName: () => "/arcforge-runtime.d.ts",
    writeFile: () => undefined,
    getCurrentDirectory: () => "/",
    getDirectories: () => [],
    fileExists: (fileName) => files.has(normalizeVirtualPath(fileName)),
    readFile: (fileName) => files.get(normalizeVirtualPath(fileName)),
    getCanonicalFileName: (fileName) => fileName.toLowerCase(),
    useCaseSensitiveFileNames: () => false,
    getNewLine: () => "\n",
    resolveModuleNames(moduleNames, containingFile) {
      return moduleNames.map((specifier) => resolveModule(specifier, containingFile, files));
    },
  };
  const program = ts.createProgram({
    rootNames: [...files.keys()],
    options,
    host,
  });
  return [...program.getSyntacticDiagnostics(), ...program.getSemanticDiagnostics()]
    .filter((diagnostic) => diagnostic.code !== 2318)
    .map(toScriptDiagnostic);
}

function resolveModule(
  specifier: string,
  importer: string,
  files: Map<string, string>
): ts.ResolvedModule | undefined {
  if (specifier === "@arcforge/engine" || specifier === "three") {
    return { resolvedFileName: "/arcforge-runtime.d.ts" };
  }
  if (!specifier.startsWith(".")) return undefined;
  const directory = importer.slice(0, importer.lastIndexOf("/") + 1);
  const base = normalizeVirtualPath(`${directory}${specifier}`);
  const path = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((item) =>
    files.has(item)
  );
  return path ? { resolvedFileName: path } : undefined;
}

function toScriptDiagnostic(diagnostic: ts.Diagnostic): ScriptDiagnostic {
  const virtualFile = diagnostic.file?.fileName ?? "scripts/unknown.ts";
  const result: ScriptDiagnostic = {
    file: virtualFile.replace(/^\//, ""),
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    severity: diagnostic.category === ts.DiagnosticCategory.Warning ? "warning" : "error",
  };
  if (diagnostic.file && diagnostic.start !== undefined) {
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    result.line = position.line + 1;
    result.column = position.character + 1;
  }
  return result;
}

function toVirtualPath(path: string): string {
  return normalizeVirtualPath(`/${path}`);
}

function normalizeVirtualPath(path: string): string {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}
