import { describe, it, expect } from 'vitest';
import { RapierPhysicsWorld } from '@adapters/rapier-physics.adapter';
import { Position } from '@domain';
import type { PhysicsComponent } from '@domain/components';

function makePhysics(): RapierPhysicsWorld {
  const physics = new RapierPhysicsWorld();
  return physics;
}

describe('RapierPhysicsWorld (adapter)', () => {
  it('initializes and can be initialized twice safely', async () => {
    const physics = makePhysics();
    await physics.init();
    await expect(physics.init()).resolves.toBeUndefined();
    expect(physics.hasBody(1)).toBe(false);
    physics.dispose();
  }, 30000);

  it('refuses to create bodies before init', () => {
    const physics = makePhysics();
    expect(() =>
      physics.createBody(1, Position.of(0, 0, 0), {
        bodyType: 'dynamic',
        shape: { kind: 'ball', radius: 0.5 },
      } as PhysicsComponent),
    ).toThrow(/init\(\)/);
  });

  it('creates a dynamic body, steps gravity, and reads back the pose', async () => {
    const physics = makePhysics();
    await physics.init();

    physics.createBody(1, Position.of(0, 10, 0), {
      bodyType: 'dynamic',
      shape: { kind: 'ball', radius: 0.5 },
    } as PhysicsComponent);

    expect(physics.hasBody(1)).toBe(true);
    physics.step(1 / 60);

    const { position } = physics.getPose(1);
    expect(position.y).toBeLessThan(10);
    physics.dispose();
  }, 30000);

  it('applies initial velocity to dynamic bodies', async () => {
    const physics = makePhysics();
    await physics.init();

    physics.createBody(1, Position.of(0, 10, 0), {
      bodyType: 'dynamic',
      shape: { kind: 'ball', radius: 0.5 },
      initialVelocity: { x: 2, y: 0, z: 0 },
    } as PhysicsComponent);

    physics.step(1 / 60);
    const { position } = physics.getPose(1);
    expect(position.x).toBeGreaterThan(0);
    physics.dispose();
  }, 30000);

  it('throws when reading the pose of an unknown body', async () => {
    const physics = makePhysics();
    await physics.init();
    expect(() => physics.getPose(999)).toThrow(/No body/);
    physics.dispose();
  }, 30000);

  it('removes bodies', async () => {
    const physics = makePhysics();
    await physics.init();

    physics.createBody(1, Position.of(0, 0, 0), {
      bodyType: 'fixed',
      shape: { kind: 'cuboid', halfExtents: { x: 1, y: 1, z: 1 } },
    } as PhysicsComponent);
    expect(physics.hasBody(1)).toBe(true);

    physics.removeBody(1);
    expect(physics.hasBody(1)).toBe(false);
    expect(() => physics.removeBody(1)).not.toThrow();
    physics.dispose();
  }, 30000);
});
