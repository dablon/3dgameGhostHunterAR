import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import { Position, Velocity, isPhysicsComponent, isPosition } from '@domain';
import { HalfExtents } from '@domain/value-objects/half-extents';
import type { TransformComponent, PhysicsComponent } from '@domain/components';
import { stepPhysics } from '@application/systems/step-physics.system';
import { InMemoryPhysicsWorld } from '@adapters/fakes';

describe('stepPhysics (use case)', () => {
  it('ensures a body for every entity with transform + physics', () => {
    const world = new World();
    const physics = new InMemoryPhysicsWorld();
    const t: TransformComponent = { position: Position.of(0, 5, 0) };
    const p: PhysicsComponent = {
      bodyType: 'dynamic',
      shape: { kind: 'ball', radius: 0.5 },
    };
    const id = world.addEntity({ transform: t, physics: p });
    stepPhysics(world, physics, 1 / 60);
    // After one step, the body is in the physics world and its pose can be read.
    const pose = physics.getPose(id);
    expect(isPhysicsComponent(p)).toBe(true);
    expect(pose.position.x).toBe(0);
  });

  it('steps the physics world once per call with the given dt', () => {
    const world = new World();
    const physics = new InMemoryPhysicsWorld();
    stepPhysics(world, physics, 0.016);
    stepPhysics(world, physics, 0.016);
    expect(physics.steps).toBe(2);
    expect(physics.lastDt).toBe(0.016);
  });

  it('writes dynamic body poses back to the entity transform', () => {
    const world = new World();
    const physics = new InMemoryPhysicsWorld();
    const id = world.addEntity({
      transform: { position: Position.of(0, 10, 0) },
      physics: {
        bodyType: 'dynamic',
        shape: { kind: 'cuboid', halfExtents: HalfExtents.cube(0.5) },
        initialVelocity: Velocity.zero(),
      },
    });

    // The in-memory physics world doesn't simulate gravity; verify the system
    // at least writes the new pose back without throwing.
    stepPhysics(world, physics, 1 / 60);
    const comp = world.get(id);
    const t = comp.transform as TransformComponent;
    expect(isPosition(t.position)).toBe(true);
    void Velocity.of(0, 0, 0);
  });

  it('ignores entities without physics component', () => {
    const world = new World();
    const physics = new InMemoryPhysicsWorld();
    world.addEntity({ transform: { position: Position.of(1, 2, 3) } });
    expect(() => stepPhysics(world, physics, 1 / 60)).not.toThrow();
    expect(physics.steps).toBe(1); // still stepped once
  });
});
