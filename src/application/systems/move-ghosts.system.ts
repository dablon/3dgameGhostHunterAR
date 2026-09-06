import type { World } from '@domain';
import type { GhostComponent, TransformComponent } from '@domain/components';
import { Position } from '@domain';

const STANDOFF = 2.0;

/**
 * Moves ghost entities relative to the player.
 * Ghosts drift toward the player, then orbit at a standoff distance,
 * while converging vertically toward the player's eye height.
 */
export function moveGhosts(
  world: World,
  dt: number,
  elapsed: number,
  playerPosition: Position,
): void {
  for (const id of world.query(['ghost', 'transform'])) {
    const comp = world.get(id);
    const ghost = comp.ghost as GhostComponent;
    const transform = comp.transform as TransformComponent;

    const dx = playerPosition.x - transform.position.x;
    const dz = playerPosition.z - transform.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    let vx = 0;
    let vz = 0;
    if (dist > STANDOFF) {
      vx = (dx / dist) * ghost.speed;
      vz = (dz / dist) * ghost.speed;
    } else if (dist > 0.01) {
      const tx = -dz / dist;
      const tz = dx / dist;
      vx = tx * ghost.speed * 0.5;
      vz = tz * ghost.speed * 0.5;
    }

    const vy = (playerPosition.y - transform.position.y) * Math.min(1, dt * 0.6);
    const bob = Math.sin(elapsed * 2 + ghost.phaseOffset) * 0.3 * dt;

    const newPos = Position.of(
      transform.position.x + vx * dt,
      transform.position.y + vy + bob,
      transform.position.z + vz * dt,
    );

    world.set(id, { transform: { position: newPos } });
  }
}
