import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import { Position, HalfExtents, isPosition, type VisualComponent, type PhysicsComponent, type LifetimeComponent, type TransformComponent } from '@domain';
import { spawnCubeOnSpace } from '@application/systems/spawn-on-space.system';
import { InMemoryInputSource } from '@adapters/fakes';

describe('spawnCubeOnSpace (use case)', () => {
  it('spawns an entity when Space is pressed', () => {
    const world = new World();
    const input = new InMemoryInputSource();
    input.nextSnapshot = {
      down: new Set(),
      pressed: new Set(['Space']),
      mouse: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: 0 },
      mouseButtons: new Set(),
      mouseClicked: new Set(),
      wheelDelta: 0,
    };
    const before = world.size;
    spawnCubeOnSpace(world, input, {
      position: Position.of(0, 5, 0),
      halfExtents: HalfExtents.cube(0.5),
      visualHandle: 'spawn-handle' as unknown as VisualComponent['handle'],
    });
    expect(world.size).toBe(before + 1);
    const ids = world.query(['transform', 'visual', 'physics', 'lifetime']);
    expect(ids.length).toBe(1);
  });

  it('does nothing when Space is not pressed', () => {
    const world = new World();
    const input = new InMemoryInputSource();
    input.nextSnapshot = {
      down: new Set(['KeyW']),
      pressed: new Set(),
      mouse: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: 0 },
      mouseButtons: new Set(),
      mouseClicked: new Set(),
      wheelDelta: 0,
    };
    spawnCubeOnSpace(world, input, {
      position: Position.of(0, 5, 0),
      halfExtents: HalfExtents.cube(0.5),
      visualHandle: 'h' as unknown as VisualComponent['handle'],
    });
    expect(world.size).toBe(0);
  });

  it('the spawned entity has lifetime set so it despawns', () => {
    const world = new World();
    const input = new InMemoryInputSource();
    input.nextSnapshot = {
      down: new Set(),
      pressed: new Set(['Space']),
      mouse: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: 0 },
      mouseButtons: new Set(),
      mouseClicked: new Set(),
      wheelDelta: 0,
    };
    spawnCubeOnSpace(world, input, {
      position: Position.of(0, 5, 0),
      halfExtents: HalfExtents.cube(0.5),
      visualHandle: 'h' as unknown as VisualComponent['handle'],
      lifetimeSeconds: 8,
    });
    const [id] = world.query(['lifetime']);
    expect(id).toBeDefined();
    const lt = (world.get(id!).lifetime as LifetimeComponent);
    expect(lt.remaining).toBe(8);
    void Position.of(0, 0, 0);
    const t = (world.get(id!).transform as TransformComponent);
    expect(isPosition(t.position)).toBe(true);
    const p = (world.get(id!).physics as PhysicsComponent);
    expect(p.bodyType).toBe('dynamic');
  });
});
