import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import { Position } from '@domain';
import type { GhostComponent, TransformComponent } from '@domain/components';
import { moveGhosts } from '@application/systems/move-ghosts.system';

function addGhost(
  world: World,
  position: Position,
  overrides: Partial<GhostComponent> = {},
): number {
  const ghost: GhostComponent = {
    type: 'wisp',
    points: 10,
    speed: 1.2,
    phaseOffset: 0,
    health: 30,
    ...overrides,
  };
  return world.addEntity({
    ghost,
    transform: { position } as TransformComponent,
  });
}

function ghostPos(world: World, id: number): Position {
  return (world.get(id).transform as TransformComponent).position;
}

const PLAYER = Position.of(0, 1.6, 5);

describe('moveGhosts (use case)', () => {
  it('moves ghosts toward the player when beyond standoff distance', () => {
    const world = new World();
    const id = addGhost(world, Position.of(0, 1.6, 20));

    const before = ghostPos(world, id);
    moveGhosts(world, 1, 0, PLAYER);
    const after = ghostPos(world, id);

    expect(after.z).toBeLessThan(before.z);
  });

  it('never crosses inside the standoff distance (orbits instead)', () => {
    const world = new World();
    const id = addGhost(world, Position.of(0, 1.6, 8), { speed: 5 });

    for (let i = 0; i < 600; i++) {
      moveGhosts(world, 1 / 60, i / 60, PLAYER);
    }

    const pos = ghostPos(world, id);
    const dist = Math.hypot(pos.x - PLAYER.x, pos.z - PLAYER.z);
    expect(dist).toBeGreaterThanOrEqual(1.9);
  });

  it('converges vertically toward the player height', () => {
    const world = new World();
    const id = addGhost(world, Position.of(0, 0.5, 8));

    for (let i = 0; i < 600; i++) {
      moveGhosts(world, 1 / 60, i / 60, PLAYER);
    }

    const pos = ghostPos(world, id);
    expect(Math.abs(pos.y - PLAYER.y)).toBeLessThan(0.2);
  });

  it('applies a bob so idle ghosts keep drifting', () => {
    const world = new World();
    const id = addGhost(world, Position.of(0, 1.6, 6));

    moveGhosts(world, 1 / 60, 0, PLAYER);
    const a = ghostPos(world, id);
    moveGhosts(world, 1 / 60, Math.PI / 4, PLAYER);
    const b = ghostPos(world, id);

    expect(a.y).not.toBe(b.y);
  });
});
