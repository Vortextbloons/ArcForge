import * as THREE from "three";
import type { AudioSource } from "@arcforge/schemas";
import type { AssetManager } from "../assets/AssetManager.js";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "../render/RenderBridge.js";

interface AudioEntry {
  signature: string;
  source: THREE.Audio | THREE.PositionalAudio;
}

export class AudioAPI {
  constructor(private readonly system: AudioSystem) {}

  play(entityId: string): void {
    this.system.play(entityId);
  }

  stop(entityId: string): void {
    this.system.stop(entityId);
  }

  setVolume(entityId: string, volume: number): void {
    this.system.setVolume(entityId, volume);
  }

  isPlaying(entityId: string): boolean {
    return this.system.isPlaying(entityId);
  }
}

/** Synchronizes audio.source components with Three.js WebAudio nodes. */
export class AudioSystem {
  readonly api = new AudioAPI(this);
  private readonly entries = new Map<string, AudioEntry>();
  private listener: THREE.AudioListener | null = null;

  constructor(private readonly assets: AssetManager) {}

  sync(world: World, bridge: RenderBridge): void {
    if (typeof window === "undefined") return;
    const listener = this.ensureListener(bridge);
    const alive = new Set<string>();
    for (const entity of world.query("audio.source")) {
      const data = world.getComponent<AudioSource>(entity.id, "audio.source");
      if (!data) continue;
      alive.add(entity.id);
      const signature = `${data.clip}|${data.spatial}`;
      let entry = this.entries.get(entity.id);
      if (!entry || entry.signature !== signature) {
        if (entry) this.remove(entity.id);
        const source = data.spatial
          ? new THREE.PositionalAudio(listener)
          : new THREE.Audio(listener);
        bridge.ensureObject(entity.id, entity.name).add(source);
        entry = { signature, source };
        this.entries.set(entity.id, entry);
        void this.assets.loadAudio(data.clip).then((buffer) => {
          if (this.entries.get(entity.id)?.source !== source) return;
          source.setBuffer(buffer);
          applySettings(source, data);
          if (data.autoplay && !source.isPlaying) source.play();
        });
      }
      applySettings(entry.source, data);
    }
    for (const id of this.entries.keys()) {
      if (!alive.has(id)) this.remove(id);
    }
  }

  play(entityId: string): void {
    const source = this.entries.get(entityId)?.source;
    if (source?.buffer && !source.isPlaying) source.play();
  }

  stop(entityId: string): void {
    const source = this.entries.get(entityId)?.source;
    if (source?.isPlaying) source.stop();
  }

  setVolume(entityId: string, volume: number): void {
    this.entries.get(entityId)?.source.setVolume(Math.max(0, volume));
  }

  isPlaying(entityId: string): boolean {
    return this.entries.get(entityId)?.source.isPlaying ?? false;
  }

  dispose(): void {
    for (const id of this.entries.keys()) this.remove(id);
    this.listener?.removeFromParent();
    this.listener = null;
  }

  private ensureListener(bridge: RenderBridge): THREE.AudioListener {
    this.listener ??= new THREE.AudioListener();
    const camera = bridge.getActiveCamera();
    if (this.listener.parent !== camera) camera.add(this.listener);
    return this.listener;
  }

  private remove(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (!entry) return;
    if (entry.source.isPlaying) entry.source.stop();
    entry.source.disconnect();
    entry.source.removeFromParent();
    this.entries.delete(entityId);
  }
}

function applySettings(source: THREE.Audio | THREE.PositionalAudio, data: AudioSource): void {
  source.setLoop(data.loop);
  source.setVolume(data.volume);
  source.setPlaybackRate(data.playbackRate);
  if (source instanceof THREE.PositionalAudio) source.setMaxDistance(data.maxDistance);
}
