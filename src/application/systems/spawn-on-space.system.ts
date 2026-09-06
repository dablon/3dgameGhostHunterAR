import type { World } from '@domain';
import type { VisualComponent, PhysicsComponent, LifetimeComponent } from '@domain/components';
import { HalfExtents } from '@domain/value-objects/half-extents';
import type { InputSnapshot } from '@adapters/fakes/input-source.fake';

export interface SpawnOptions {
  position: { x: number; y: number; z: number };
  halfExtents: HalfExtents;
  visualHandle: VisualComponent['handle'];
  lifetimeSeconds?: number;
}

/**
 * Spawns a physics cube when Space is freshly pressed this frame.
 */
export function spawnCubeOnSpace(
  world: World,
  input: { getSnapshot(): InputSnapshot },
  opts: SpawnOptions,
): void {
  const snap = input.getSnapshot();
  if (!snap.pressed.has('Space')) return;

  world.addEntity({
    transform: { position: opts.position },
    visual: { handle: opts.visualHandle },
    physics: {
      bodyType: 'dynamic',
      shape: { kind: 'cuboid', halfExtents: opts.halfExtents },
    } as PhysicsComponent,
    lifetime: { remaining: opts.lifetimeSeconds ?? 10 } as LifetimeComponent,
  });
}
