import { Position, isPosition } from './value-objects/position';
import { Rotation } from './value-objects/rotation';
import { Velocity } from './value-objects/velocity';
import { HalfExtents, isHalfExtents } from './value-objects/half-extents';
import { Health } from './value-objects/health';
import { Score } from './value-objects/score';

// ─── Transform ────────────────────────────────────────────────────────────────

export interface TransformComponent {
  position: Position;
  rotation?: Rotation;
  scale?: { x: number; y: number; z: number };
}

export function isTransformComponent(v: unknown): v is TransformComponent {
  if (v == null || typeof v !== 'object') return false;
  const c = v as TransformComponent;
  return (
    'position' in c &&
    isPosition(c.position)
  );
}

// ─── Visual ───────────────────────────────────────────────────────────────────

export interface VisualComponent {
  handle: string;
  opacity?: number;
  emissive?: { r: number; g: number; b: number };
}

export function isVisualComponent(v: unknown): v is VisualComponent {
  if (!(v instanceof Object)) return false;
  const c = v as VisualComponent;
  return 'handle' in c && typeof c.handle === 'string' && c.handle.length > 0;
}

// ─── Physics ──────────────────────────────────────────────────────────────────

export interface CuboidShape {
  kind: 'cuboid';
  halfExtents: HalfExtents;
}

export interface BallShape {
  kind: 'ball';
  radius: number;
}

export type PhysicsShape = CuboidShape | BallShape;

export type BodyType = 'dynamic' | 'fixed' | 'kinematic';

export interface PhysicsComponent {
  bodyType: BodyType;
  shape: PhysicsShape;
  initialVelocity?: Velocity;
  gravityScale?: number;
  linearDamping?: number;
  angularDamping?: number;
}

export function isPhysicsComponent(v: unknown): v is PhysicsComponent {
  if (!(v instanceof Object)) return false;
  const c = v as PhysicsComponent;
  if (c.bodyType !== 'dynamic' && c.bodyType !== 'fixed' && c.bodyType !== 'kinematic') {
    return false;
  }
  if (!('shape' in c)) return false;
  const shape = c.shape as PhysicsShape;
  if (shape.kind === 'cuboid') {
    return isHalfExtents(shape.halfExtents);
  }
  if (shape.kind === 'ball') {
    return typeof shape.radius === 'number' && Number.isFinite(shape.radius);
  }
  return false;
}

// ─── Ghost ───────────────────────────────────────────────────────────────────

export type GhostType = 'wisp' | 'specter' | 'poltergeist' | 'banshee';

export interface GhostComponent {
  type: GhostType;
  points: number;
  speed: number;
  phaseOffset: number;
  health: number;
}

export function isGhostComponent(v: unknown): v is GhostComponent {
  if (!(v instanceof Object)) return false;
  const c = v as GhostComponent;
  const validTypes: GhostType[] = ['wisp', 'specter', 'poltergeist', 'banshee'];
  return (
    'type' in c &&
    typeof c.type === 'string' &&
    validTypes.includes(c.type) &&
    typeof c.points === 'number' &&
    typeof c.speed === 'number' &&
    typeof c.health === 'number' &&
    Number.isFinite(c.health)
  );
}

// ─── Lifetime ────────────────────────────────────────────────────────────────

export interface LifetimeComponent {
  remaining: number;
}

export function isLifetimeComponent(v: unknown): v is LifetimeComponent {
  if (!(v instanceof Object)) return false;
  const c = v as LifetimeComponent;
  return (
    'remaining' in c &&
    typeof c.remaining === 'number' &&
    Number.isFinite(c.remaining) &&
    c.remaining >= 0
  );
}

// ─── Fly Camera ─────────────────────────────────────────────────────────────

export interface FlyCameraComponent {
  speed: number;
  boost: number;
  position: Position;
  yaw: number;
  pitch: number;
}

export function isFlyCameraComponent(v: unknown): v is FlyCameraComponent {
  if (v == null || typeof v !== 'object') return false;
  const c = v as FlyCameraComponent;
  return (
    'speed' in c &&
    typeof c.speed === 'number' &&
    'boost' in c &&
    typeof c.boost === 'number' &&
    'position' in c &&
    isPosition(c.position) &&
    'yaw' in c &&
    typeof c.yaw === 'number' &&
    'pitch' in c &&
    typeof c.pitch === 'number'
  );
}

// ─── Projectile (ghost-hunter beam) ─────────────────────────────────────────

export interface ProjectileComponent {
  damage: number;
  lifetime: number;
  velocity: Velocity;
}

export function isProjectileComponent(v: unknown): v is ProjectileComponent {
  if (!(v instanceof Object)) return false;
  const c = v as ProjectileComponent;
  return (
    'damage' in c &&
    typeof c.damage === 'number' &&
    'lifetime' in c &&
    typeof c.lifetime === 'number' &&
    'velocity' in c &&
    c.velocity instanceof Object &&
    'x' in c.velocity
  );
}

// ─── Player ──────────────────────────────────────────────────────────────────

export interface PlayerComponent {
  health: Health;
  score: Score;
  kills: number;
}

export function isPlayerComponent(v: unknown): v is PlayerComponent {
  if (!(v instanceof Object)) return false;
  const c = v as PlayerComponent;
  return (
    'health' in c &&
    c.health instanceof Object &&
    'current' in c.health &&
    'max' in c.health &&
    'score' in c &&
    c.score instanceof Object &&
    'value' in c.score
  );
}

// ─── Ghost Spawner ───────────────────────────────────────────────────────────

export interface SpawnerComponent {
  interval: number;
  elapsed: number;
  maxGhosts: number;
}

export function isSpawnerComponent(v: unknown): v is SpawnerComponent {
  if (!(v instanceof Object)) return false;
  const c = v as SpawnerComponent;
  return (
    'interval' in c &&
    typeof c.interval === 'number' &&
    'elapsed' in c &&
    typeof c.elapsed === 'number' &&
    'maxGhosts' in c &&
    typeof c.maxGhosts === 'number'
  );
}
