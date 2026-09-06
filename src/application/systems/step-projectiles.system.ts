import type { World, EntityId } from '@domain';
import type { GhostComponent, ProjectileComponent, TransformComponent } from '@domain/components';
import { Position } from '@domain';

/**
 * Moves projectiles each frame. Despawns when lifetime expires or they travel too far.
 */
export function stepProjectiles(
  world: World,
  dt: number,
): void {
  const toRemove: EntityId[] = [];

  for (const id of world.query(['projectile', 'transform'])) {
    const comp = world.get(id);
    const proj = comp.projectile as ProjectileComponent;
    const t = comp.transform as TransformComponent;

    proj.lifetime -= dt;
    if (proj.lifetime <= 0) {
      toRemove.push(id);
      continue;
    }

    const newPos = Position.of(
      t.position.x + proj.velocity.x * dt,
      t.position.y + proj.velocity.y * dt,
      t.position.z + proj.velocity.z * dt,
    );

    world.set(id, {
      transform: { position: newPos },
      projectile: proj,
    });
  }

  for (const id of toRemove) {
    world.removeEntity(id);
  }
}

/**
 * Checks projectiles against ghost positions (simple sphere-sphere distance test).
 * Returns array of [projectileId, ghostId] pairs that collided.
 */
export function checkProjectileGhostCollisions(
  world: World,
  hitRadius = 0.6,
): Array<[EntityId, EntityId]> {
  const hits: Array<[EntityId, EntityId]> = [];
  const projectileIds = world.query(['projectile', 'transform']);
  const ghostIds = world.query(['ghost', 'transform']);

  for (const pid of projectileIds) {
    const pc = world.get(pid);
    const pt = pc.transform as TransformComponent;

    for (const gid of ghostIds) {
      const gc = world.get(gid);
      const gt = gc.transform as TransformComponent;

      const dx = pt.position.x - gt.position.x;
      const dy = pt.position.y - gt.position.y;
      const dz = pt.position.z - gt.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < hitRadius) {
        hits.push([pid, gid]);
      }
    }
  }

  return hits;
}

/**
 * Resolves projectile-ghost collisions: damages ghosts, removes projectiles,
 * awards score to player, despawns dead ghosts.
 */
export function resolveProjectileCollisions(
  world: World,
  hits: Array<[EntityId, EntityId]>,
  playerId: EntityId,
): void {
  const killedGhosts = new Set<EntityId>();

  for (const [pid, gid] of hits) {
    if (killedGhosts.has(gid) || !world.isAlive(pid) || !world.isAlive(gid)) continue;

    const projComp = world.get(pid);
    const proj = projComp.projectile as ProjectileComponent;
    world.removeEntity(pid);

    const ghostRec = world.get(gid);
    const ghost = ghostRec.ghost as GhostComponent;
    const nextHp = ghost.health - proj.damage;

    if (nextHp <= 0) {
      killedGhosts.add(gid);
      world.removeEntity(gid);

      const playerRec = world.get(playerId);
      const p = playerRec.player as { score: { value: number }; kills: number; health: { current: number; max: number } };
      world.set(playerId, {
        player: {
          health: p.health,
          score: { value: p.score.value + ghost.points },
          kills: p.kills + 1,
        },
      });
    } else {
      world.set(gid, { ghost: { ...ghost, health: nextHp } });
    }
  }

  world.flush();
}
