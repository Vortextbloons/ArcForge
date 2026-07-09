import { useMemo } from "react";
import { ViewportCanvas } from "./viewport/ViewportCanvas";
import sampleScene from "./fixtures/Main.scene.json";

function App() {
  const entities = useMemo(() => sampleScene.entities, []);

  return (
    <div className="editor">
      <header className="editor__toolbar">
        <span className="editor__brand">ThreeForge</span>
        <span className="editor__scene">{sampleScene.name}</span>
      </header>

      <aside className="editor__hierarchy">
        <h2>Hierarchy</h2>
        <ul>
          {entities.map((entity) => (
            <li key={entity.id}>{entity.name}</li>
          ))}
        </ul>
      </aside>

      <main className="editor__viewport">
        <ViewportCanvas />
      </main>

      <aside className="editor__inspector">
        <h2>Inspector</h2>
        <p className="muted">Select an entity to edit components.</p>
      </aside>
    </div>
  );
}

export default App;
