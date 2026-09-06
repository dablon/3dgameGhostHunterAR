import type { World } from '@domain';
import type { LifetimeComponent } from '@domain/components';

/**
 * Decrements `remaining` on every entity that has a LifetimeComponent.
 * Marks entities for removal when `remaining` reaches zero.
 */
export function despawnExpired(world: World, dt: number): void {
  for (const id of world.query(['lifetime'])) {
    const comp = world.get(id);
    const lt = comp.lifetime as LifetimeComponent;
    lt.remaining = Math.max(0, lt.remaining - dt);
    if (lt.remaining <= 0) {
      world.removeEntity(id);
    }
  }
}
