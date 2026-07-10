import { CORE_COMPONENTS } from "@threeforge/schemas";
import type { DocSource } from "./types.js";

/**
 * Generate docs entries from component schemas (inspector + AI usage notes).
 */
export function indexComponentSchemas(): DocSource[] {
  return CORE_COMPONENTS.map((component) => {
    const fields = component.inspector
      .map((f) => `- \`${f.key}\` (${f.type})${f.label ? ` — ${f.label}` : ""}`)
      .join("\n");
    const body = `# ${component.displayName} (\`${component.id}\`)

${component.docs.summary}

## AI usage

${component.docs.aiUsage}

## Defaults

\`\`\`json
${JSON.stringify(component.defaults, null, 2)}
\`\`\`

## Inspector fields

${fields || "_No fields_"}
`;

    return {
      uri: `threeforge://docs/components/${component.id}`,
      title: `${component.displayName} (${component.id})`,
      kind: "schema" as const,
      path: "",
      tags: ["components", "schema", component.id],
      scope: "components" as const,
      body,
    };
  });
}
