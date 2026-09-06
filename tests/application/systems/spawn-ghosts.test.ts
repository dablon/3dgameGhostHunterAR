import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import type { EntityId } from '@domain/ecs/world';
import type { GhostComponent, TransformComponent } from '@domain/components';
import { spawnGhosts, type GhostFactory } from '@application/systems/spawn-ghosts.system';

const factory: GhostFactory = (world, position, type) =>
  world.addEntity({
    ghost: {
      type,
      points: 10,
      speed: 1,
      phaseOffset: 0,
      health: 30,
    } as GhostComponent,
    transform: { position } as TransformComponent,
  });

describe('spawnGhosts (use case)', () => {
  it('does not spawn before the interval elapses', () => {
    const world = new World();
    world.addEntity({ spawner: { interval: 3, elapsed: 0, maxGhosts: 8 } });

    spawnGhosts(world, 1, factory);

    expect(world.query(['ghost'])).toHaveLength(0);
  });

  it('spawns one ghost per elapsed interval', () => {
    const world = new World();
    world.addEntity({ spawner: { interval: 3, elapsed: 0, maxGhosts: 8 } });

    spawnGhosts(world, 3, factory);
    expect(world.query(['ghost'])).toHaveLength(1);

    spawnGhosts(world, 3, factory);
    expect(world.query(['ghost'])).toHaveLength(2);
  });

  it('respects the maxGhosts cap', () => {
    const world = new World();
    world.addEntity({ spawner: { interval: 1, elapsed: 0, maxGhosts: 2 } });

    for (let i = 0; i < 5; i++) {
      spawnGhosts(world, 1, factory);
    }

    expect(world.query(['ghost'])).toHaveLength(2);
  });

  it('resets the spawner timer after each spawn', () => {
    const world = new World();
    const spawnerId: EntityId = world.addEntity({
      spawner: { interval: 2, elapsed: 0, maxGhosts: 8 },
    });

    spawnGhosts(world, 2, factory);

    const spawner = world.get(spawnerId).spawner as { elapsed: number };
    expect(spawner.elapsed).toBe(0);
  });

  it('spawns ghosts on a ring 8–14 units from the origin', () => {
    const world = new World();
    world.addEntity({ spawner: { interval: 0.5, elapsed: 0, maxGhosts: 20 } });

    for (let i = 0; i < 20; i++) {
      spawnGhosts(world, 0.5, factory);
    }

    for (const id of world.query(['ghost', 'transform'])) {
      const t = world.get(id).transform as TransformComponent;
      const dist = Math.hypot(t.position.x, t.position.z);
      expect(dist).toBeGreaterThanOrEqual(8);
      expect(dist).toBeLessThanOrEqual(14);
    }
  });
});
