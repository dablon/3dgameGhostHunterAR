import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import type { EntityId } from '@domain/ecs/world';
import { Position, Velocity } from '@domain';
import type {
  GhostComponent,
  PlayerComponent,
  ProjectileComponent,
  TransformComponent,
} from '@domain/components';
import {
  stepProjectiles,
  checkProjectileGhostCollisions,
  resolveProjectileCollisions,
} from '@application/systems/step-projectiles.system';

function addProjectile(
  world: World,
  position: Position,
  overrides: Partial<ProjectileComponent> = {},
): EntityId {
  const projectile: ProjectileComponent = {
    damage: 30,
    lifetime: 3,
    velocity: Velocity.of(0, 0, -10),
    ...overrides,
  };
  return world.addEntity({
    projectile,
    transform: { position } as TransformComponent,
  });
}

function addGhost(
  world: World,
  position: Position,
  overrides: Partial<GhostComponent> = {},
): EntityId {
  const ghost: GhostComponent = {
    type: 'wisp',
    points: 10,
    speed: 1.2,
    phaseOffset: 0,
    health: 30,
    ...overrides,
  };
  return world.addEntity({ ghost, transform: { position } as TransformComponent });
}

function addPlayer(world: World): EntityId {
  return world.addEntity({
    player: {
      health: { current: 100, max: 100 },
      score: { value: 0 },
      kills: 0,
    } as PlayerComponent,
  });
}

function playerStats(world: World, id: EntityId): { score: number; kills: number } {
  const p = world.get(id).player as PlayerComponent;
  return { score: p.score.value, kills: p.kills };
}

describe('stepProjectiles (use case)', () => {
  it('moves projectiles along their velocity', () => {
    const world = new World();
    const id = addProjectile(world, Position.of(0, 0, 10), {
      velocity: Velocity.of(1, 2, -4),
    });

    stepProjectiles(world, 0.5);

    const t = world.get(id).transform as TransformComponent;
    expect(t.position.x).toBeCloseTo(0.5);
    expect(t.position.y).toBeCloseTo(1);
    expect(t.position.z).toBeCloseTo(8);
  });

  it('removes projectiles whose lifetime has expired', () => {
    const world = new World();
    addProjectile(world, Position.of(0, 0, 0), { lifetime: 0.1 });

    stepProjectiles(world, 0.2);

    expect(world.query(['projectile'])).toHaveLength(0);
  });

  it('keeps projectiles that still have lifetime left', () => {
    const world = new World();
    addProjectile(world, Position.of(0, 0, 0), { lifetime: 1 });

    stepProjectiles(world, 0.2);

    expect(world.query(['projectile'])).toHaveLength(1);
  });
});

describe('checkProjectileGhostCollisions (use case)', () => {
  it('detects a projectile within the hit radius of a ghost', () => {
    const world = new World();
    const pid = addProjectile(world, Position.of(0, 0, 0));
    const gid = addGhost(world, Position.of(0.3, 0.3, 0.3));

    const hits = checkProjectileGhostCollisions(world, 0.6);

    expect(hits).toContainEqual([pid, gid]);
  });

  it('ignores projectiles outside the hit radius', () => {
    const world = new World();
    addProjectile(world, Position.of(0, 0, 0));
    addGhost(world, Position.of(5, 0, 0));

    expect(checkProjectileGhostCollisions(world, 0.6)).toHaveLength(0);
  });
});

describe('resolveProjectileCollisions (use case)', () => {
  it('damages the ghost and removes the projectile', () => {
    const world = new World();
    const pid = addProjectile(world, Position.of(0, 0, 0));
    const gid = addGhost(world, Position.of(0, 0, 0), { health: 60 });
    const playerId = addPlayer(world);

    resolveProjectileCollisions(world, [[pid, gid]], playerId);

    const ghost = world.get(gid).ghost as GhostComponent;
    expect(ghost.health).toBe(30);
    expect(world.isAlive(pid)).toBe(false);
  });

  it('kills the ghost, awards its points and increments kills', () => {
    const world = new World();
    const pid = addProjectile(world, Position.of(0, 0, 0));
    const gid = addGhost(world, Position.of(0, 0, 0), { points: 50, health: 30 });
    const playerId = addPlayer(world);

    resolveProjectileCollisions(world, [[pid, gid]], playerId);

    expect(world.isAlive(gid)).toBe(false);
    expect(playerStats(world, playerId)).toEqual({ score: 50, kills: 1 });
  });

  it('accumulates damage across separate frames (no per-frame HP reset)', () => {
    const world = new World();
    const playerId = addPlayer(world);
    const gid = addGhost(world, Position.of(0, 0, 0), { health: 60 });

    for (let i = 0; i < 2; i++) {
      const pid = addProjectile(world, Position.of(0, 0, 0));
      const hits = checkProjectileGhostCollisions(world, 0.6);
      resolveProjectileCollisions(world, hits, playerId);
      void pid;
    }

    expect(world.isAlive(gid)).toBe(false);
    expect(playerStats(world, playerId).kills).toBe(1);
  });

  it('ignores hits on a ghost already killed in the same frame', () => {
    const world = new World();
    const playerId = addPlayer(world);
    const gid = addGhost(world, Position.of(0, 0, 0), { points: 10, health: 30 });
    const p1 = addProjectile(world, Position.of(0, 0, 0));
    const p2 = addProjectile(world, Position.of(0.1, 0, 0));

    resolveProjectileCollisions(
      world,
      [
        [p1, gid],
        [p2, gid],
      ],
      playerId,
    );

    expect(playerStats(world, playerId)).toEqual({ score: 10, kills: 1 });
  });
});
