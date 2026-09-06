import type { PhysicsWorld } from '@application/systems/step-physics.system';
import type { PhysicsComponent } from '@domain/components';
import { Position } from '@domain';

/**
 * In-memory physics world for unit tests.
 * Tracks calls and exposes `steps`, `lastDt` for assertions.
 * Does NOT simulate gravity — bodies stay where they are put.
 */
export class InMemoryPhysicsWorld implements PhysicsWorld {
  steps = 0;
  lastDt = 0;

  private bodies = new Map<number, { pos: Position; vel?: { x: number; y: number; z: number } }>();

  createBody(id: number, pos: Position, _comp: PhysicsComponent): void {
    this.bodies.set(id, { pos });
  }

  removeBody(id: number): void {
    this.bodies.delete(id);
  }

  step(dt: number): void {
    this.steps++;
    this.lastDt = dt;
    // No real simulation — bodies remain at their last-known position
    for (const body of this.bodies.values()) {
      body.pos = Position.of(body.pos.x, body.pos.y, body.pos.z);
    }
  }

  getPose(id: number): { position: Position } {
    const body = this.bodies.get(id);
    if (!body) throw new Error(`No body for entity ${id}`);
    return { position: body.pos };
  }

  hasBody(id: number): boolean {
    return this.bodies.has(id);
  }
}
