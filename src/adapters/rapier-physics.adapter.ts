import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsWorld } from '@application/systems/step-physics.system';
import { Position } from '@domain';
import type { PhysicsComponent } from '@domain/components';

let initialized = false;
let initPromise: Promise<void> | null = null;

async function ensureInit(): Promise<void> {
  if (!initialized) {
    initPromise ??= RAPIER.init().then(() => {
      initialized = true;
    });
    await initPromise;
  }
}

const GRAVITY = { x: 0.0, y: -9.81, z: 0.0 };

export class RapierPhysicsWorld implements PhysicsWorld {
  private world: RAPIER.World | null = null;
  private bodies: Map<number, RAPIER.RigidBody> = new Map();

  async init(): Promise<void> {
    await ensureInit();
    this.world ??= new RAPIER.World(GRAVITY);
  }

  private get w(): RAPIER.World {
    if (!this.world) {
      throw new Error('RapierPhysicsWorld.init() must be awaited before use');
    }
    return this.world;
  }

  createBody(id: number, pos: Position, comp: PhysicsComponent): void {
    const colliderDesc = this.makeCollider(comp.shape);
    let bodyDesc: RAPIER.RigidBodyDesc;

    if (comp.bodyType === 'dynamic') {
      bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(pos.x, pos.y, pos.z);
    } else if (comp.bodyType === 'kinematic') {
      bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(pos.x, pos.y, pos.z);
    } else {
      bodyDesc = RAPIER.RigidBodyDesc.fixed()
        .setTranslation(pos.x, pos.y, pos.z);
    }

    const body = this.w.createRigidBody(bodyDesc);
    this.w.createCollider(colliderDesc, body);
    this.bodies.set(id, body);

    if (comp.initialVelocity) {
      body.setLinvel(
        { x: comp.initialVelocity.x, y: comp.initialVelocity.y, z: comp.initialVelocity.z },
        true,
      );
    }
  }

  removeBody(id: number): void {
    const body = this.bodies.get(id);
    if (body) {
      this.w.removeRigidBody(body);
      this.bodies.delete(id);
    }
  }

  step(_dt: number): void {
    this.w.step();
  }

  getPose(id: number): { position: Position } {
    const body = this.bodies.get(id);
    if (!body) throw new Error(`No body for entity ${id}`);
    const t = body.translation();
    return { position: Position.of(t.x, t.y, t.z) };
  }

  hasBody(id: number): boolean {
    return this.bodies.has(id);
  }

  private makeCollider(shape: PhysicsComponent['shape']): RAPIER.ColliderDesc {
    if (shape.kind === 'cuboid') {
      const h = shape.halfExtents;
      return RAPIER.ColliderDesc.cuboid(h.x, h.y, h.z);
    } else {
      return RAPIER.ColliderDesc.ball(shape.radius);
    }
  }

  dispose(): void {
    this.world?.free();
    this.world = null;
  }
}
