import type { World } from '@domain';
import type { FlyCameraComponent } from '@domain/components';
import { Position } from '@domain/value-objects/position';
import type { InputSnapshot } from '@adapters/fakes/input-source.fake';

const HALF_PI = Math.PI / 2;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Reads keyboard/mouse input and updates flyCamera positions on all matching entities.
 */
export function flyCameraInput(
  world: World,
  input: { getSnapshot(): InputSnapshot },
  dt: number,
): void {
  const snap = input.getSnapshot();

  for (const id of world.query(['flyCamera'])) {
    const comp = world.get(id);
    const cam = comp.flyCamera as FlyCameraComponent;

    const { down, mouseDelta } = snap;
    const sensitivity = 0.002;

    // Mouse look
    let yaw = cam.yaw - mouseDelta.x * sensitivity;
    let pitch = clamp(cam.pitch - mouseDelta.y * sensitivity, -HALF_PI + 0.01, HALF_PI - 0.01);

    const isBoost = down.has('ShiftLeft') || down.has('ShiftRight');
    const speed = isBoost ? cam.boost : cam.speed;

    // Direction vectors
    const fwdX = -Math.sin(yaw) * Math.cos(pitch);
    const fwdY = Math.sin(pitch);
    const fwdZ = -Math.cos(yaw) * Math.cos(pitch);

    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const fwd = (down.has('KeyW') ? 1 : 0) - (down.has('KeyS') ? 1 : 0);
    const strafe = (down.has('KeyD') ? 1 : 0) - (down.has('KeyA') ? 1 : 0);
    const vertical = (down.has('KeyE') ? 1 : 0) - (down.has('KeyQ') ? 1 : 0);

    const dx = (fwd * fwdX + strafe * rightX) * speed * dt;
    const dy = (fwd * fwdY + vertical) * speed * dt;
    const dz = (fwd * fwdZ + strafe * rightZ) * speed * dt;

    const newPos = Position.of(
      cam.position.x + dx,
      cam.position.y + dy,
      cam.position.z + dz,
    );

    world.set(id, {
      flyCamera: { ...cam, yaw, pitch, position: newPos },
    });
  }
}
