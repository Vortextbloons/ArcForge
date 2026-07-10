import * as THREE from "three";
import type { Animator } from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "../render/RenderBridge.js";

interface AnimatorEntry {
  object: THREE.Object3D;
  signature: string;
  mixer: THREE.AnimationMixer;
  action: THREE.AnimationAction;
}

/** Plays animation.animator components on loaded model assets. */
export class AnimationSystem {
  private readonly entries = new Map<string, AnimatorEntry>();

  update(world: World, bridge: RenderBridge, delta: number): void {
    const alive = new Set<string>();
    for (const entity of world.query("animation.animator")) {
      const data = world.getComponent<Animator>(entity.id, "animation.animator");
      const object = bridge.getObject(entity.id);
      if (!data || !object || object.animations.length === 0) continue;
      alive.add(entity.id);
      const clip = data.clip
        ? THREE.AnimationClip.findByName(object.animations, data.clip)
        : object.animations[0];
      if (!clip) continue;
      const signature = `${clip.name}|${data.loop}`;
      let entry = this.entries.get(entity.id);
      if (!entry || entry.object !== object || entry.signature !== signature) {
        this.remove(entity.id);
        const mixer = new THREE.AnimationMixer(object);
        const action = mixer.clipAction(clip);
        action.setLoop(data.loop ? THREE.LoopRepeat : THREE.LoopOnce, data.loop ? Infinity : 1);
        action.clampWhenFinished = !data.loop;
        if (data.autoplay) action.play();
        entry = { object, signature, mixer, action };
        this.entries.set(entity.id, entry);
      }
      entry.action.timeScale = data.speed;
      entry.mixer.update(delta);
    }
    for (const id of this.entries.keys()) {
      if (!alive.has(id)) this.remove(id);
    }
  }

  play(entityId: string, fadeSeconds = 0): void {
    const action = this.entries.get(entityId)?.action;
    if (!action) return;
    action.reset().fadeIn(fadeSeconds).play();
  }

  stop(entityId: string, fadeSeconds = 0): void {
    this.entries.get(entityId)?.action.fadeOut(fadeSeconds);
  }

  dispose(): void {
    for (const id of this.entries.keys()) this.remove(id);
  }

  private remove(entityId: string): void {
    const entry = this.entries.get(entityId);
    if (!entry) return;
    entry.mixer.stopAllAction();
    entry.mixer.uncacheRoot(entry.object);
    this.entries.delete(entityId);
  }
}
