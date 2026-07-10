import ts from "typescript";
import { semanticTypecheck } from "./semanticTypecheck.js";

export interface ScriptDiagnostic {
  file: string;
  message: string;
  severity: "error" | "warning";
  line?: number;
  column?: number;
}

export interface ScriptTypecheckResult {
  ok: boolean;
  diagnostics: ScriptDiagnostic[];
}

export interface ScriptSource {
  path: string;
  source: string;
}

const FORBIDDEN_IMPORTS = [
  /^node:/,
  /^@tauri-apps\//,
  /^@arcforge\/editor-core$/,
  /^@arcforge\/mcp-server$/,
];
const ALLOWED_EXTERNALS = new Set(["@arcforge/engine", "three"]);

/** TypeScript parser/transpiler validation plus project-module graph checks. */
export function typecheckScripts(scripts: ScriptSource[]): ScriptTypecheckResult {
  const diagnostics: ScriptDiagnostic[] = [];
  const paths = new Set(scripts.map((script) => normalizePath(script.path)));

  for (const script of scripts) {
    const file = normalizePath(script.path);
    const validLocation =
      file.startsWith("scripts/") || /^plugins\/[^/]+\/systems\/.+\.system\.ts$/.test(file);
    if (!validLocation || (!file.endsWith(".ts") && !file.endsWith(".tsx"))) {
      diagnostics.push(
        error(file, "Modules must be under scripts/ or a plugin systems/ directory")
      );
    }

    const transpiled = ts.transpileModule(script.source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
        strict: true,
      },
    });
    for (const diagnostic of transpiled.diagnostics ?? []) {
      diagnostics.push(fromTypeScript(file, diagnostic));
    }

    const sourceFile = ts.createSourceFile(file, script.source, ts.ScriptTarget.Latest, true);
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        validateImport(
          file,
          statement.moduleSpecifier.text,
          statement,
          sourceFile,
          paths,
          diagnostics
        );
      }
      if (
        ts.isClassDeclaration(statement) &&
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
      ) {
        const extendsBehaviour = statement.heritageClauses?.some(
          (clause) =>
            clause.token === ts.SyntaxKind.ExtendsKeyword &&
            clause.types.some((type) => type.expression.getText(sourceFile) === "Behaviour")
        );
        if (!extendsBehaviour) {
          diagnostics.push(
            atNode(file, statement, sourceFile, "Default-exported classes must extend Behaviour")
          );
        }
      }
    }
  }

  diagnostics.push(...semanticTypecheck(scripts));

  const unique = new Map<string, ScriptDiagnostic>();
  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}:${diagnostic.message}`;
    unique.set(key, diagnostic);
  }
  const finalDiagnostics = [...unique.values()];

  return {
    ok: finalDiagnostics.every((diagnostic) => diagnostic.severity !== "error"),
    diagnostics: finalDiagnostics,
  };
}

function validateImport(
  file: string,
  specifier: string,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  paths: Set<string>,
  diagnostics: ScriptDiagnostic[]
): void {
  if (FORBIDDEN_IMPORTS.some((pattern) => pattern.test(specifier))) {
    diagnostics.push(
      atNode(
        file,
        node,
        sourceFile,
        `Scripts may not import editor, Tauri, MCP, or Node APIs: ${specifier}`
      )
    );
    return;
  }
  if (specifier.startsWith(".")) {
    if (!resolveImport(file, specifier, paths)) {
      diagnostics.push(
        atNode(file, node, sourceFile, `Cannot resolve project module: ${specifier}`)
      );
    }
    return;
  }
  if (!ALLOWED_EXTERNALS.has(specifier)) {
    diagnostics.push({
      ...atNode(
        file,
        node,
        sourceFile,
        `External module is not available in preview: ${specifier}`
      ),
      severity: "warning",
    });
  }
}

function resolveImport(importer: string, specifier: string, paths: Set<string>): string | null {
  const slash = importer.lastIndexOf("/");
  const directory = slash >= 0 ? importer.slice(0, slash + 1) : "";
  const base = normalizePath(`${directory}${specifier}`);
  return (
    [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((path) => paths.has(path)) ?? null
  );
}

function normalizePath(input: string): string {
  const result: string[] = [];
  for (const part of input.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") result.pop();
    else result.push(part);
  }
  return result.join("/");
}

function fromTypeScript(file: string, diagnostic: ts.Diagnostic): ScriptDiagnostic {
  const result = error(file, ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
  if (diagnostic.start !== undefined && diagnostic.file) {
    const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
    result.line = position.line + 1;
    result.column = position.character + 1;
  }
  return result;
}

function atNode(
  file: string,
  node: ts.Node,
  sourceFile: ts.SourceFile,
  message: string
): ScriptDiagnostic {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return {
    file,
    message,
    severity: "error",
    line: position.line + 1,
    column: position.character + 1,
  };
}

function error(file: string, message: string): ScriptDiagnostic {
  return { file, message, severity: "error" };
}
