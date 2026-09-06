// Domain — pure business logic, zero framework imports
export { World } from './ecs/world';
export type { EntityId, EntityRecord, DomainEvent } from './ecs/world';
export { EntityNotFoundError, DuplicateEntityError, DomainError } from './errors/domain-error';

export { Position, isPosition } from './value-objects/position';
export { Rotation, isRotation } from './value-objects/rotation';
export { Velocity, isVelocity, assertVelocity } from './value-objects/velocity';
export { HalfExtents, isHalfExtents } from './value-objects/half-extents';
export { Score, isScore } from './value-objects/score';
export { Health, isHealth } from './value-objects/health';

export type {
  TransformComponent,
  VisualComponent,
  PhysicsComponent,
  CuboidShape,
  BallShape,
  BodyType,
  GhostComponent,
  GhostType,
  LifetimeComponent,
  FlyCameraComponent,
  ProjectileComponent,
  PlayerComponent,
  SpawnerComponent,
} from './components';
export {
  isTransformComponent,
  isVisualComponent,
  isPhysicsComponent,
  isGhostComponent,
  isLifetimeComponent,
  isFlyCameraComponent,
  isProjectileComponent,
  isPlayerComponent,
  isSpawnerComponent,
} from './components';
