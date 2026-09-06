import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import { despawnExpired } from '@application/systems/despawn-expired.system';
import type { LifetimeComponent } from '@domain/components';

describe('despawnExpired (use case)', () => {
  it('removes entities whose lifetime.remaining hit zero', () => {
    const world = new World();
    const a = world.addEntity({ lifetime: { remaining: 0 } as LifetimeComponent });
    const b = world.addEntity({ lifetime: { remaining: 5 } as LifetimeComponent });
    despawnExpired(world, 1);
    world.flush();
    expect(world.isAlive(a)).toBe(false);
    expect(world.isAlive(b)).toBe(true);
  });

  it('decrements remaining by dt each tick', () => {
    const world = new World();
    const id = world.addEntity({ lifetime: { remaining: 2 } as LifetimeComponent });
    despawnExpired(world, 0.5);
    const lt = (world.get(id).lifetime as LifetimeComponent);
    expect(lt.remaining).toBeCloseTo(1.5, 5);
  });

  it('ignores entities without lifetime component', () => {
    const world = new World();
    world.addEntity({ kind: 'no-lifetime' });
    expect(() => despawnExpired(world, 1)).not.toThrow();
    expect(world.size).toBe(1);
  });
});
