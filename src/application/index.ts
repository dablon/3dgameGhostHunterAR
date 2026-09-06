// Application layer — use cases and systems (pure, no framework)
export { despawnExpired } from './systems/despawn-expired.system';
export { stepPhysics, type PhysicsWorld } from './systems/step-physics.system';
export { moveGhosts } from './systems/move-ghosts.system';
export {
  stepProjectiles,
  checkProjectileGhostCollisions,
  resolveProjectileCollisions,
} from './systems/step-projectiles.system';
export { spawnGhosts } from './systems/spawn-ghosts.system';
export type { GhostFactory } from './systems/spawn-ghosts.system';
export { flyCameraInput } from './systems/fly-camera-input.system';
export { renderEntities } from './systems/render-entities.system';
export { spawnCubeOnSpace, type SpawnOptions } from './systems/spawn-on-space.system';
