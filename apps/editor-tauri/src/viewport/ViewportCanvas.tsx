import { useEffect, useRef } from "react";
import { Runtime } from "@threeforge/engine";
import sampleScene from "../fixtures/Main.scene.json";

/**
 * Three.js viewport backed by the engine Runtime.
 * Phase 1: loads the sample scene and runs the render loop.
 */
export function ViewportCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const runtime = new Runtime({
      canvas,
      antialias: true,
      shadows: true,
    });

    runtime.load(sampleScene);

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
      runtime.dispose();
    };
  }, []);

  return (
    <div className="viewport" ref={hostRef}>
      <canvas ref={canvasRef} className="viewport__canvas" />
    </div>
  );
}
