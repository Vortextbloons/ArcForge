import { useEffect, useRef } from "react";
import { Runtime } from "@arcforge/engine";
import { useEditorStore } from "../app/EditorStore";
import { usePlayMode } from "../app/PlayModeContext";
import { DEMO_SCRIPTS } from "../scripts/demoScripts";
import { useProjectSession } from "../app/ProjectSession";
import { loadProjectPrefabs } from "../project/loadProjectPrefabs";
import { loadProjectScenes } from "../project/loadProjectScenes";
import { joinProjectPath } from "../project/projectModel";

/**
 * Three.js viewport backed by the engine Runtime.
 * Reloads when the editor scene revision changes (edit mode only).
 */
export function ViewportCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<Runtime | null>(null);
  const { scene, revision } = useEditorStore();
  const { playing, setRuntime } = usePlayMode();
  const { project } = useProjectSession();
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const projectRef = useRef(project);
  projectRef.current = project;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const runtime = new Runtime({
      canvas,
      // Scope pointer to the viewport host so look/zoom ignore editor panels.
      inputTarget: host,
      antialias: true,
      shadows: true,
      scriptsEnabled: false,
      physics: "rapier",
    });
    runtime.registerScripts(DEMO_SCRIPTS);
    runtimeRef.current = runtime;
    setRuntime(runtime);
    if (!projectRef.current?.root) runtime.load(sceneRef.current);

    const resize = () => {
      const { clientWidth, clientHeight } = host;
      if (clientWidth > 0 && clientHeight > 0) {
        runtime.setSize(clientWidth, clientHeight);
      }
    };

    resize();
    runtime.start();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    return () => {
      observer.disconnect();
      setRuntime(null);
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, [setRuntime]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || playingRef.current || !project?.root) return;
    let cancelled = false;
    void (async () => {
      const { convertFileSrc } = await import("@tauri-apps/api/core");
      const [prefabs, scenes] = await Promise.all([
        loadProjectPrefabs(project.root),
        loadProjectScenes(project.root),
      ]);
      if (cancelled) return;
      runtime.prefabs.clear();
      runtime.scenes.clear();
      runtime.registerPrefabs(prefabs.prefabs);
      runtime.registerScenes(scenes.scenes);
      runtime.setAssetUrlResolver((path) => convertFileSrc(joinProjectPath(project.root, path)));
      for (const message of [...prefabs.errors, ...scenes.errors]) runtime.logger.error(message);
      runtime.load(sceneRef.current, project.manifest.defaultScene);
    })().catch((error: unknown) => {
      runtime.logger.error(error instanceof Error ? error.message : String(error));
    });
    return () => {
      cancelled = true;
    };
  }, [project?.root, project?.manifest.defaultScene]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime || playingRef.current) return;
    try {
      runtime.load(scene);
    } catch (error) {
      console.error("Failed to reload scene into viewport:", error);
      runtime.logger.error(
        error instanceof Error ? error.message : `Scene reload failed: ${String(error)}`
      );
    }
  }, [revision, scene]);

  // Capture keyboard focus while playing so WASD reaches InputAPI.
  useEffect(() => {
    if (!playing) return;
    const host = hostRef.current;
    host?.focus({ preventScroll: true });

    const onPointerDown = () => {
      host?.focus({ preventScroll: true });
    };
    host?.addEventListener("pointerdown", onPointerDown);
    return () => host?.removeEventListener("pointerdown", onPointerDown);
  }, [playing]);

  return (
    <div
      className={`viewport${playing ? " is-playing" : ""}`}
      ref={hostRef}
      tabIndex={playing ? 0 : -1}
      role="application"
      aria-label="Game viewport"
    >
      <canvas ref={canvasRef} className="viewport__canvas" />
      {playing ? <div className="viewport__badge">PLAYING — click viewport, then WASD</div> : null}
    </div>
  );
}
