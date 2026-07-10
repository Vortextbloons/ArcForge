import * as THREE from "three";
import type { ParticleEmitter } from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { RenderBridge } from "./RenderBridge.js";

interface EmitterState {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  positions: Float32Array;
  velocities: Float32Array;
  ages: Float32Array;
  count: number;
  accumulator: number;
  signature: string;
  data: ParticleEmitter;
}

/** Bounded CPU particle emitter for render.particles components. */
export class ParticleSystem {
  private readonly emitters = new Map<string, EmitterState>();

  update(world: World, bridge: RenderBridge, delta: number): void {
    const alive = new Set<string>();
    for (const entity of world.query("render.particles")) {
      const data = world.getComponent<ParticleEmitter>(entity.id, "render.particles");
      if (!data) continue;
      alive.add(entity.id);
      const signature = `${data.maxParticles}|${data.color}|${data.size}`;
      let state = this.emitters.get(entity.id);
      if (!state || state.signature !== signature) {
        this.remove(entity.id);
        state = createEmitter(data, signature);
        bridge.ensureObject(entity.id, entity.name).add(state.points);
        this.emitters.set(entity.id, state);
      }
      updateEmitter(state, data, delta);
      state.data = data;
    }
    for (const id of this.emitters.keys()) {
      if (!alive.has(id)) this.remove(id);
    }
  }

  burst(entityId: string, count: number): void {
    const state = this.emitters.get(entityId);
    if (state) {
      spawn(state, state.data, Math.min(count, state.data.maxParticles - state.count));
    }
  }

  dispose(): void {
    for (const id of this.emitters.keys()) this.remove(id);
  }

  private remove(entityId: string): void {
    const state = this.emitters.get(entityId);
    if (!state) return;
    state.points.removeFromParent();
    state.points.geometry.dispose();
    state.points.material.dispose();
    this.emitters.delete(entityId);
  }
}

function createEmitter(data: ParticleEmitter, signature: string): EmitterState {
  const positions = new Float32Array(data.maxParticles * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.PointsMaterial({
    color: data.color,
    size: data.size,
    transparent: true,
    depthWrite: false,
  });
  return {
    points: new THREE.Points(geometry, material),
    positions,
    velocities: new Float32Array(data.maxParticles * 3),
    ages: new Float32Array(data.maxParticles),
    count: 0,
    accumulator: 0,
    signature,
    data,
  };
}

function updateEmitter(state: EmitterState, data: ParticleEmitter, delta: number): void {
  let write = 0;
  for (let read = 0; read < state.count; read++) {
    const age = state.ages[read]! + delta;
    if (age >= data.lifetime) continue;
    if (write !== read) copyParticle(state, read, write);
    state.ages[write] = age;
    const offset = write * 3;
    state.positions[offset] += state.velocities[offset]! * delta;
    state.positions[offset + 1] += state.velocities[offset + 1]! * delta;
    state.positions[offset + 2] += state.velocities[offset + 2]! * delta;
    write++;
  }
  state.count = write;
  if (data.playing) {
    state.accumulator += data.rate * delta;
    const count = Math.min(Math.floor(state.accumulator), data.maxParticles - state.count);
    if (count > 0) {
      state.accumulator -= count;
      spawn(state, data, count);
    }
  }
  state.points.geometry.setDrawRange(0, state.count);
  state.points.geometry.attributes.position!.needsUpdate = true;
}

function spawn(state: EmitterState, data: ParticleEmitter, count: number): void {
  for (let index = 0; index < count; index++) {
    const particle = state.count++;
    const offset = particle * 3;
    state.positions[offset] = state.positions[offset + 1] = state.positions[offset + 2] = 0;
    state.velocities[offset] = data.velocity[0] + randomSpread(data.spread[0]);
    state.velocities[offset + 1] = data.velocity[1] + randomSpread(data.spread[1]);
    state.velocities[offset + 2] = data.velocity[2] + randomSpread(data.spread[2]);
    state.ages[particle] = 0;
  }
}

function copyParticle(state: EmitterState, from: number, to: number): void {
  state.ages[to] = state.ages[from]!;
  for (let axis = 0; axis < 3; axis++) {
    state.positions[to * 3 + axis] = state.positions[from * 3 + axis]!;
    state.velocities[to * 3 + axis] = state.velocities[from * 3 + axis]!;
  }
}

function randomSpread(spread: number): number {
  return (Math.random() * 2 - 1) * spread;
}
