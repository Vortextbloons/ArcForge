import { useEffect, useRef } from "react";
import { Runtime } from "@arcforge/engine";
import { useEditorStore } from "../app/EditorStore";
import { usePlayMode } from "../app/PlayModeContext";
import { DEMO_SCRIPTS } from "../scripts/demoScripts";

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
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const runtime = new Runtime({
      canvas,
      antialias: true,
      shadows: true,
      scriptsEnabled: false,
      physics: "rapier",
    });
    runtime.registerScripts(DEMO_SCRIPTS);
    runtimeRef.current = runtime;
    setRuntime(runtime);
    try {
      runtime.load(sceneRef.current);
    } catch (error) {
      console.error("Failed to load scene into viewport:", error);
      runtime.logger.error(
        error instanceof Error ? error.message : `Scene load failed: ${String(error)}`
      );
    }

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

  return (
    <div className={`viewport${playing ? " is-playing" : ""}`} ref={hostRef}>
      <canvas ref={canvasRef} className="viewport__canvas" />
      {playing ? <div className="viewport__badge">PLAYING</div> : null}
    </div>
  );
}
