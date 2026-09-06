import type { World, EntityId } from '@domain';
import type { SpawnerComponent, GhostType } from '@domain/components';
import { Position } from '@domain';

export interface GhostFactory {
  (world: World, position: Position, ghostType: GhostType): EntityId;
}

const GHOST_TYPES: GhostType[] = ['wisp', 'specter', 'poltergeist', 'banshee'];

/**
 * Advances the spawner timer and calls the factory when interval elapses.
 * Respects maxGhosts cap.
 */
export function spawnGhosts(
  world: World,
  dt: number,
  factory: GhostFactory,
): void {
  for (const id of world.query(['spawner'])) {
    const comp = world.get<{ spawner: SpawnerComponent }>(id);
    const spawner = comp.spawner;

    // Count active ghosts
    const activeGhosts = world.query(['ghost']).length;

    spawner.elapsed += dt;

    if (spawner.elapsed >= spawner.interval && activeGhosts < spawner.maxGhosts) {
      spawner.elapsed = 0;

      // Pick a random ghost type
      const idx = Math.floor(Math.random() * GHOST_TYPES.length);
      const type = GHOST_TYPES[idx]!; // GHOST_TYPES is non-empty so idx is always valid

      // Random spawn position around the player in a ring
      const angle = Math.random() * Math.PI * 2;
      const radius = 8 + Math.random() * 6;
      const spawnPos = Position.of(
        Math.cos(angle) * radius,
        0.5 + Math.random() * 2,
        Math.sin(angle) * radius,
      );

      factory(world, spawnPos, type);
      world.set(id, { spawner });
    } else {
      world.set(id, { spawner });
    }
  }
}
