import { useEffect, useMemo, useState } from "react";
import {
  AddComponentCommand,
  RemoveComponentCommand,
  RenameEntityCommand,
  UpdateComponentCommand,
} from "@arcforge/editor-core";
import {
  CORE_COMPONENTS,
  CORE_COMPONENT_MAP,
  type InspectorField,
} from "@arcforge/schemas";
import { useEditorStore } from "../app/EditorStore";

function NameField({ entityId, name }: { entityId: string; name: string }) {
  const { execute } = useEditorStore();
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    setDraft(name);
  }, [name, entityId]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setDraft(name);
      return;
    }
    void execute(new RenameEntityCommand(entityId, trimmed));
  };

  return (
    <label className="field">
      <span>Name</span>
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

function FieldEditor({
  field,
  value,
  onCommit,
}: {
  field: InspectorField;
  value: unknown;
  onCommit: (next: unknown) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  if (field.type === "boolean") {
    return (
      <label className="field">
        <span>{field.label}</span>
        <input
          type="checkbox"
          checked={Boolean(draft)}
          onChange={(e) => {
            setDraft(e.target.checked);
            onCommit(e.target.checked);
          }}
        />
      </label>
    );
  }

  if (field.type === "vec3") {
    const vec = Array.isArray(draft) ? (draft as number[]) : [0, 0, 0];
    return (
      <label className="field">
        <span>{field.label}</span>
        <div className="field__vec3">
          {([0, 1, 2] as const).map((axis) => (
            <input
              key={axis}
              type="number"
              step="0.1"
              value={Number(vec[axis] ?? 0)}
              onChange={(e) => {
                const next = [...vec];
                next[axis] = Number(e.target.value);
                setDraft(next);
              }}
              onBlur={(e) => {
                const next = [...vec];
                next[axis] = Number(e.target.value);
                setDraft(next);
                onCommit(next);
              }}
            />
          ))}
        </div>
      </label>
    );
  }

  if (field.type === "enum" && field.options) {
    return (
      <label className="field">
        <span>{field.label}</span>
        <select
          value={String(draft ?? field.options[0])}
          onChange={(e) => {
            setDraft(e.target.value);
            onCommit(e.target.value);
          }}
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "color") {
    return (
      <label className="field">
        <span>{field.label}</span>
        <input
          type="color"
          value={String(draft ?? "#888888")}
          onChange={(e) => {
            setDraft(e.target.value);
            onCommit(e.target.value);
          }}
        />
      </label>
    );
  }

  const inputType = field.type === "number" ? "number" : "text";
  return (
    <label className="field">
      <span>{field.label}</span>
      <input
        type={inputType}
        step={field.type === "number" ? "0.1" : undefined}
        value={draft === undefined || draft === null ? "" : String(draft)}
        onChange={(e) =>
          setDraft(
            field.type === "number" ? Number(e.target.value) : e.target.value
          )
        }
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
    </label>
  );
}

function ComponentSection({
  entityId,
  componentId,
  data,
}: {
  entityId: string;
  componentId: string;
  data: unknown;
}) {
  const { execute } = useEditorStore();
  const def = CORE_COMPONENT_MAP[componentId];
  const fields = def?.inspector ?? [];

  const commitField = (key: string, fieldValue: unknown) => {
    const next = {
      ...(data as Record<string, unknown>),
      [key]: fieldValue,
    };
    if (JSON.stringify(next) === JSON.stringify(data)) return;
    void execute(new UpdateComponentCommand(entityId, componentId, next));
  };

  return (
    <section className="inspector__component">
      <div className="panel__header">
        <h3>{def?.displayName ?? componentId}</h3>
        {componentId !== "core.transform" && (
          <button
            type="button"
            className="btn btn--small btn--danger"
            onClick={() =>
              void execute(new RemoveComponentCommand(entityId, componentId))
            }
          >
            Remove
          </button>
        )}
      </div>
      {fields.length === 0 ? (
        <pre className="inspector__raw">{JSON.stringify(data, null, 2)}</pre>
      ) : (
        fields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={(data as Record<string, unknown>)?.[field.key]}
            onCommit={(fieldValue) => commitField(field.key, fieldValue)}
          />
        ))
      )}
    </section>
  );
}

export function InspectorPanel() {
  const { selectedEntity, execute } = useEditorStore();
  const missingComponents = useMemo(() => {
    if (!selectedEntity) return [];
    return CORE_COMPONENTS.filter(
      (c) => selectedEntity.components[c.id] === undefined
    );
  }, [selectedEntity]);

  if (!selectedEntity) {
    return (
      <aside className="editor__inspector">
        <h2>Inspector</h2>
        <p className="muted">Select an entity to edit components.</p>
      </aside>
    );
  }

  return (
    <aside className="editor__inspector">
      <h2>Inspector</h2>
      <NameField
        key={selectedEntity.id}
        entityId={selectedEntity.id}
        name={selectedEntity.name}
      />
      <p className="muted inspector__id">{selectedEntity.id}</p>

      {Object.entries(selectedEntity.components).map(([componentId, data]) => (
        <ComponentSection
          key={componentId}
          entityId={selectedEntity.id}
          componentId={componentId}
          data={data}
        />
      ))}

      {missingComponents.length > 0 && (
        <div className="inspector__add">
          <h3>Add Component</h3>
          <div className="inspector__add-list">
            {missingComponents.map((def) => (
              <button
                key={def.id}
                type="button"
                className="btn btn--small"
                onClick={() =>
                  void execute(
                    new AddComponentCommand(
                      selectedEntity.id,
                      def.id,
                      structuredClone(def.defaults)
                    )
                  )
                }
              >
                {def.displayName}
              </button>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
