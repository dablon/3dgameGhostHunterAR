import type { World } from '@domain';
import type { PhysicsComponent, TransformComponent } from '@domain/components';
import { Position } from '@domain';

/** Minimal physics engine interface used by the system */
export interface PhysicsWorld {
  createBody(id: number, pos: Position, comp: PhysicsComponent): void;
  removeBody(id: number): void;
  step(dt: number): void;
  getPose(id: number): { position: Position };
  hasBody(id: number): boolean;
}

export interface StepPhysicsDeps {
  physics: PhysicsWorld;
}

/**
 * Syncs entity transforms with the physics world.
 * Creates a rigid body for every entity with physics + transform components.
 * Steps the world once per call.
 */
export function stepPhysics(
  world: World,
  physics: PhysicsWorld,
  dt: number,
): void {
  // Register bodies for new entities
  for (const id of world.query(['transform', 'physics'])) {
    if (!physics.hasBody(id)) {
      const comp = world.get(id);
      const t = comp.transform as TransformComponent;
      const p = comp.physics as PhysicsComponent;
      physics.createBody(id, t.position, p);
    }
  }

  // Step
  physics.step(dt);

  // Write back dynamic body positions
  for (const id of world.query(['transform', 'physics'])) {
    const comp = world.get(id);
    const p = comp.physics as PhysicsComponent;
    if (p.bodyType === 'dynamic') {
      try {
        const pose = physics.getPose(id);
        world.set(id, { transform: { position: pose.position } });
      } catch {
        // Body may not have a valid pose yet — skip
      }
    }
  }
}
