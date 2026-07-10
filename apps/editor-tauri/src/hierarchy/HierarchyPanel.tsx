import { useMemo } from "react";
import { CreateEntityCommand, DeleteEntityCommand } from "@arcforge/editor-core";
import type { Entity } from "@arcforge/schemas";
import { useEditorStore } from "../app/EditorStore";

function buildTree(entities: Entity[]) {
  const byParent = new Map<string | null, Entity[]>();
  for (const entity of entities) {
    const key = entity.parent ?? null;
    const list = byParent.get(key) ?? [];
    list.push(entity);
    byParent.set(key, list);
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return byParent;
}

function HierarchyNode({
  entity,
  depth,
  childrenMap,
}: {
  entity: Entity;
  depth: number;
  childrenMap: Map<string | null, Entity[]>;
}) {
  const { selection, setSelection, execute } = useEditorStore();
  const selected = selection.includes(entity.id);
  const children = childrenMap.get(entity.id) ?? [];

  return (
    <li>
      <button
        type="button"
        className={`hierarchy__item${selected ? " is-selected" : ""}`}
        style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        onClick={() => setSelection([entity.id])}
        onContextMenu={(event) => {
          event.preventDefault();
          setSelection([entity.id]);
        }}
      >
        <span className="hierarchy__name">{entity.name}</span>
        <button
          type="button"
          className="hierarchy__delete"
          title="Delete"
          onClick={(event) => {
            event.stopPropagation();
            void execute(new DeleteEntityCommand(entity.id));
          }}
        >
          ×
        </button>
      </button>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <HierarchyNode
              key={child.id}
              entity={child}
              depth={depth + 1}
              childrenMap={childrenMap}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function HierarchyPanel() {
  const { scene, execute } = useEditorStore();
  const childrenMap = useMemo(() => buildTree(scene.entities), [scene.entities]);
  const roots = childrenMap.get(null) ?? [];

  return (
    <aside className="editor__hierarchy">
      <div className="panel__header">
        <h2>Hierarchy</h2>
        <button
          type="button"
          className="btn btn--small"
          onClick={() => void execute(new CreateEntityCommand({ name: "Entity" }))}
        >
          + Entity
        </button>
      </div>
      <ul className="hierarchy__tree">
        {roots.map((entity) => (
          <HierarchyNode key={entity.id} entity={entity} depth={0} childrenMap={childrenMap} />
        ))}
      </ul>
    </aside>
  );
}
