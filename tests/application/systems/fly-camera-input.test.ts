import { describe, it, expect } from 'vitest';
import { World } from '@domain/ecs/world';
import { Position, type FlyCameraComponent } from '@domain';
import { flyCameraInput } from '@application/systems/fly-camera-input.system';
import { InMemoryInputSource } from '@adapters/fakes';

describe('flyCameraInput (use case)', () => {
  it('moves the camera forward when W is held', () => {
    const world = new World();
    const input = new InMemoryInputSource();
    const initialPos: [number, number, number] = [0, 0, 10];
    const id = world.addEntity({
      flyCamera: {
        speed: 10,
        boost: 1,
        position: Position.fromTuple(initialPos),
        yaw: 0,
        pitch: 0,
      } satisfies FlyCameraComponent,
    });

    input.nextSnapshot = {
      down: new Set(['KeyW']),
      pressed: new Set(),
      mouse: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: 0 },
      mouseButtons: new Set(),
      mouseClicked: new Set(),
      wheelDelta: 0,
    };

    flyCameraInput(world, input, 1.0);
    const fly = (world.get(id).flyCamera as FlyCameraComponent);
    expect(fly.position.z).toBeLessThan(initialPos[2]);
  });

  it('does nothing when no keys are pressed', () => {
    const world = new World();
    const input = new InMemoryInputSource();
    const id = world.addEntity({
      flyCamera: {
        speed: 10,
        boost: 1,
        position: Position.fromTuple([5, 5, 5]),
        yaw: 1,
        pitch: 0.2,
      } satisfies FlyCameraComponent,
    });
    flyCameraInput(world, input, 1.0);
    const fly = (world.get(id).flyCamera as FlyCameraComponent);
    expect(fly.position.x).toBe(5);
    expect(fly.position.y).toBe(5);
    expect(fly.position.z).toBe(5);
  });

  it('applies boost when ShiftLeft is held', () => {
    const world = new World();
    const input = new InMemoryInputSource();
    const id = world.addEntity({
      flyCamera: {
        speed: 1,
        boost: 10,
        position: Position.fromTuple([0, 0, 100]),
        yaw: 0,
        pitch: 0,
      } satisfies FlyCameraComponent,
    });
    input.nextSnapshot = {
      down: new Set(['KeyW', 'ShiftLeft']),
      pressed: new Set(),
      mouse: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: 0 },
      mouseButtons: new Set(),
      mouseClicked: new Set(),
      wheelDelta: 0,
    };
    flyCameraInput(world, input, 1.0);
    const fly = (world.get(id).flyCamera as FlyCameraComponent);
    // boosted move > unboosted (1 * 10 = 10 units) — so we should travel at least 5 units forward
    expect(fly.position.z).toBeLessThan(95);
  });

  it('clamps pitch to avoid gimbal flip', () => {
    const world = new World();
    const input = new InMemoryInputSource();
    const id = world.addEntity({
      flyCamera: {
        speed: 1,
        boost: 1,
        position: Position.fromTuple([0, 0, 0]),
        yaw: 0,
        pitch: 0,
      } satisfies FlyCameraComponent,
    });
    input.nextSnapshot = {
      down: new Set(),
      pressed: new Set(),
      mouse: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: -10_000 }, // huge upward drag (negative Y = up on screen)
      mouseButtons: new Set(),
      mouseClicked: new Set(),
      wheelDelta: 0,
    };
    flyCameraInput(world, input, 0.016);
    const fly = (world.get(id).flyCamera as FlyCameraComponent);
    expect(fly.pitch).toBeGreaterThan(Math.PI / 4); // pitched up significantly
    expect(fly.pitch).toBeLessThanOrEqual(Math.PI / 2); // never fully inverted
  });
});
