export function AssetBrowserPanel() {
  return (
    <section className="editor__assets">
      <div className="panel__header">
        <h2>Assets</h2>
      </div>
      <div className="assets__list">
        <div className="assets__item">
          <span className="assets__icon">▣</span>
          <span>scenes/Main.scene.json</span>
        </div>
        <div className="assets__item muted">
          <span className="assets__icon">◻</span>
          <span>Import assets… (coming soon)</span>
        </div>
      </div>
    </section>
  );
}
