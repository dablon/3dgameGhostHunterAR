import { describe, it, expect } from 'vitest';
import { Position } from '@domain/value-objects/position';
import { Rotation } from '@domain/value-objects/rotation';
import { HalfExtents } from '@domain/value-objects/half-extents';
import {
  isTransformComponent,
  isVisualComponent,
  isPhysicsComponent,
  isFlyCameraComponent,
  isLifetimeComponent,
  type TransformComponent,
  type PhysicsComponent,
} from '@domain/components';

describe('Component type guards (DDD: components as data, type-checked at boundaries)', () => {
  it('TransformComponent requires a Position value object', () => {
    const ok: TransformComponent = { position: Position.origin() };
    expect(isTransformComponent(ok)).toBe(true);
    expect(isTransformComponent({ position: { x: 0, y: 0, z: 0 } })).toBe(false); // plain object rejected
    expect(isTransformComponent({ position: Position.origin(), rotation: Rotation.identity() })).toBe(true);
    expect(isTransformComponent({})).toBe(false);
    expect(isTransformComponent(null)).toBe(false);
  });

  it('VisualComponent requires a non-empty handle', () => {
    expect(isVisualComponent({ handle: 'h1' })).toBe(true);
    expect(isVisualComponent({})).toBe(false);
    expect(isVisualComponent({ handle: '' })).toBe(false);
    expect(isVisualComponent({ handle: 42 })).toBe(false);
  });

  it('PhysicsComponent discriminated union: cuboid vs ball', () => {
    const cuboid: PhysicsComponent = {
      bodyType: 'dynamic',
      shape: { kind: 'cuboid', halfExtents: HalfExtents.cube(1) },
    };
    const ball: PhysicsComponent = {
      bodyType: 'fixed',
      shape: { kind: 'ball', radius: 0.5 },
    };
    expect(isPhysicsComponent(cuboid)).toBe(true);
    expect(isPhysicsComponent(ball)).toBe(true);
    expect(isPhysicsComponent({ bodyType: 'dynamic' })).toBe(false); // missing shape
    expect(isPhysicsComponent({ bodyType: 'dynamic', shape: { kind: 'cuboid', halfExtents: { x: 1, y: 1, z: 1 } } })).toBe(false); // raw halfExtents rejected
    expect(isPhysicsComponent({ bodyType: 'magic', shape: { kind: 'cuboid', halfExtents: HalfExtents.cube(1) } })).toBe(false);
  });

  it('FlyCameraComponent requires speed, boost, Position, yaw, pitch', () => {
    expect(
      isFlyCameraComponent({
        speed: 1,
        boost: 1,
        position: Position.origin(),
        yaw: 0,
        pitch: 0,
      }),
    ).toBe(true);
    expect(isFlyCameraComponent({ speed: 1 })).toBe(false);
    expect(
      isFlyCameraComponent({
        speed: 1,
        boost: 1,
        position: { x: 0, y: 0, z: 0 }, // raw object, not Position
        yaw: 0,
        pitch: 0,
      }),
    ).toBe(false);
  });

  it('LifetimeComponent requires non-negative finite remaining seconds', () => {
    expect(isLifetimeComponent({ remaining: 5 })).toBe(true);
    expect(isLifetimeComponent({ remaining: 0 })).toBe(true); // 0 is valid (despawn now)
    expect(isLifetimeComponent({})).toBe(false);
    expect(isLifetimeComponent({ remaining: -1 })).toBe(false);
    expect(isLifetimeComponent({ remaining: NaN })).toBe(false);
  });
});
