/**
 * Ghost Hunter AR — Composition Root
 *
 * Wires the ECS world, physics adapter, scene manager, and input system.
 * Runs the fixed-timestep game loop with requestAnimationFrame.
 */
import { World } from '@domain/ecs/world';
import type { EntityId } from '@domain/ecs/world';
import { Position } from '@domain/value-objects/position';
import type { GhostType, FlyCameraComponent, PlayerComponent, TransformComponent, ProjectileComponent, SpawnerComponent } from '@domain/components';
import { InMemoryPhysicsWorld } from '@adapters/fakes/in-memory-physics.world';
import { RapierPhysicsWorld } from '@adapters/rapier-physics.adapter';
import type { PhysicsWorld } from '@application/systems/step-physics.system';
import {
  despawnExpired,
  moveGhosts,
  stepProjectiles,
  checkProjectileGhostCollisions,
  resolveProjectileCollisions,
  spawnGhosts,
  stepPhysics,
  type GhostFactory,
} from '@application';
import { GhostSceneManager } from './scene-builder';
import { InputManager } from './input-manager';

// ─── Config ───────────────────────────────────────────────────────────────────

const FIXED_DT = 1 / 60;
const MAX_FRAME_TIME = 0.1; // prevent spiral of death

// ─── Composition Root ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) {
    showError('No #app element found in DOM');
    return;
  }

  const canvas = document.createElement('canvas');
  app.appendChild(canvas);

  // Build ECS world
  const world = new World();

  // Build physics
  let physics: PhysicsWorld;
  try {
    const rapier = new RapierPhysicsWorld();
    await rapier.init();
    physics = rapier;
  } catch (err) {
    console.warn('[GhostHunter] Rapier unavailable, using in-memory physics:', err);
    physics = new InMemoryPhysicsWorld();
  }

  // Build scene
  const scene = new GhostSceneManager(canvas);
  window.addEventListener('resize', () => scene.handleResize());

  // Build input
  const input = new InputManager(canvas);

  // ─── Spawn the player entity ────────────────────────────────────────────────
  const startPos = Position.of(0, 1.6, 5);
  const playerId = world.addEntity({
    player: {
      health: { current: 100, max: 100 },
      score: { value: 0 },
      kills: 0,
    } as PlayerComponent,
    transform: {
      position: startPos,
    } as TransformComponent,
    flyCamera: {
      speed: 3,
      boost: 8,
      position: startPos,
      yaw: 0,
      pitch: 0,
    } as FlyCameraComponent,
  });

  // ─── Spawn the ghost spawner ───────────────────────────────────────────────
  world.addEntity({
    spawner: {
      interval: 3.0,
      elapsed: 0,
      maxGhosts: 8,
    } as SpawnerComponent,
  });

  // ─── Ghost factory ──────────────────────────────────────────────────────────
  const ghostFactory: GhostFactory = (w, pos, type) => {
    const configs: Record<GhostType, { points: number; speed: number; health: number }> = {
      wisp: { points: 10, speed: 1.2, health: 30 },
      specter: { points: 25, speed: 1.8, health: 60 },
      poltergeist: { points: 50, speed: 2.5, health: 90 },
      banshee: { points: 100, speed: 3.5, health: 120 },
    };
    const cfg = configs[type]!;
    const ghostComponent = { type, points: cfg.points, speed: cfg.speed, phaseOffset: Math.random() * Math.PI * 2, health: cfg.health } as const;
    const id = w.addEntity({
      ghost: { ...ghostComponent } as { type: GhostType; points: number; speed: number; phaseOffset: number },
      transform: { position: pos } as TransformComponent,
      lifetime: { remaining: 20 } as { remaining: number },
    });
    scene.spawnGhostMesh(id, type, pos);
    return id;
  };

  // ─── Game state ─────────────────────────────────────────────────────────────
  let elapsed = 0;
  let accumulator = 0;
  let lastTime = performance.now();
  const cooldown = { remaining: 0.0 };

  // ─── Loop ───────────────────────────────────────────────────────────────────
  // Init AR as fire-and-forget so the game never waits on camera permission
  void scene.initAR();

  scene.startLoop(() => {
    const now = performance.now();
    const frameTime = Math.min((now - lastTime) / 1000, MAX_FRAME_TIME);
    lastTime = now;
    accumulator += frameTime;

    // Fixed-timestep physics
    while (accumulator >= FIXED_DT) {
      fixedStep(world, physics, playerId, elapsed, ghostFactory, scene, FIXED_DT, cooldown, input);
      accumulator -= FIXED_DT;
      elapsed += FIXED_DT;
    }

    // Camera follows the player every frame (not only when pointer is locked)
    const cam = world.get<{ flyCamera: FlyCameraComponent; transform: TransformComponent }>(playerId);
    scene.updateCameraFromInput(cam.flyCamera.yaw, cam.flyCamera.pitch, cam.transform.position);

    updateSceneFromWorld(world, scene, elapsed);
    updateHUD(world, playerId);
  });

  // Debug/testing hook — lets e2e tests and devtools inspect live game state
  (window as unknown as Record<string, unknown>).__ghDebug = {
    snapshot: () => {
      const player = world.get<{ player: PlayerComponent; transform: TransformComponent }>(playerId);
      return {
        score: player.player.score.value,
        kills: player.player.kills,
        ghosts: world.query(['ghost']).length,
        projectiles: world.query(['projectile', 'transform']).length,
        playerPos: {
          x: player.transform.position.x,
          y: player.transform.position.y,
          z: player.transform.position.z,
        },
        ghostPositions: world.query(['ghost', 'transform']).map((id) => {
          const g = world.get<{ ghost: { type: string; health: number }; transform: TransformComponent }>(id);
          return {
            id,
            type: g.ghost.type,
            health: g.ghost.health,
            pos: {
              x: g.transform.position.x,
              y: g.transform.position.y,
              z: g.transform.position.z,
            },
          };
        }),
      };
    },
  };
}

function fixedStep(
  world: World,
  physics: PhysicsWorld,
  playerId: EntityId,
  elapsed: number,
  ghostFactory: GhostFactory,
  scene: GhostSceneManager,
  dt: number,
  cooldown: { remaining: number },
  input: InputManager,
): void {
  const player = world.get<{ flyCamera: FlyCameraComponent; transform: TransformComponent }>(playerId);

  // ── Camera / movement input ───────────────────────────────────────────────
  const keys = input.getState().keys;
  const BASE_SPEED = player.flyCamera.speed;
  const BOOST = player.flyCamera.boost;
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? BOOST : BASE_SPEED;

  let yaw = player.flyCamera.yaw;
  let pitch = player.flyCamera.pitch;
  const pos = player.transform.position;

  if (input.getState().pointerLocked) {
    const { dx, dy } = input.consumeMouseDelta();
    const sensitivity = 0.002;
    yaw -= dx * sensitivity;
    pitch -= dy * sensitivity;
    pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, pitch));
  }

  // WASD movement
  const forward = keys.has('KeyW') ? 1 : keys.has('KeyS') ? -1 : 0;
  const strafe = keys.has('KeyA') ? -1 : keys.has('KeyD') ? 1 : 0;
  const upDown = keys.has('KeyE') ? 1 : keys.has('KeyQ') ? -1 : 0;

  const fwd = {
    x: -Math.sin(yaw) * forward,
    z: -Math.cos(yaw) * forward,
  };
  const right = {
    x: Math.cos(yaw) * strafe,
    z: -Math.sin(yaw) * strafe,
  };

  const newPos = Position.of(
    pos.x + (fwd.x + right.x) * speed * dt,
    pos.y + upDown * speed * dt,
    pos.z + (fwd.z + right.z) * speed * dt,
  );

  world.set(playerId, {
    flyCamera: { ...player.flyCamera, yaw, pitch, position: newPos },
    transform: { position: newPos },
  });

  // ── Fire projectile ─────────────────────────────────────────────────────────
  cooldown.remaining = Math.max(0, cooldown.remaining - dt);
  if ((input.getState().leftMouseDown || keys.has('Space')) && cooldown.remaining <= 0) {
    const yawAngle = yaw;
    const pitchAngle = pitch;

    const dir = {
      x: -Math.sin(yawAngle) * Math.cos(pitchAngle),
      y: Math.sin(pitchAngle),
      z: -Math.cos(yawAngle) * Math.cos(pitchAngle),
    };

    const spawnPos = Position.of(
      newPos.x + dir.x * 0.5,
      newPos.y + dir.y * 0.5,
      newPos.z + dir.z * 0.5,
    );

    const PROJECTILE_SPEED = 24;
    const projId = world.addEntity({
      projectile: {
        damage: 30,
        lifetime: 3.0,
        velocity: {
          x: dir.x * PROJECTILE_SPEED,
          y: dir.y * PROJECTILE_SPEED,
          z: dir.z * PROJECTILE_SPEED,
        },
      } as ProjectileComponent,
      transform: { position: spawnPos } as TransformComponent,
      lifetime: { remaining: 3.0 } as { remaining: number },
    });

    scene.spawnProjectileMesh(projId, spawnPos);
    cooldown.remaining = 0.25;
  }

  // ── Systems ─────────────────────────────────────────────────────────────────
  spawnGhosts(world, dt, ghostFactory);
  moveGhosts(world, dt, elapsed, newPos);
  stepProjectiles(world, dt);
  stepPhysics(world, physics, dt);
  despawnExpired(world, dt);

  // Collision detection
  const hits = checkProjectileGhostCollisions(world, 0.6);
  resolveProjectileCollisions(world, hits, playerId);

  // Remove ghost meshes for entities that were despawned
  for (const [id] of scene['ghostMeshes']) {
    if (!world.isAlive(id)) {
      scene.removeGhostMesh(id);
    }
  }
  for (const [id] of scene['projectileMeshes']) {
    if (!world.isAlive(id)) {
      scene.removeProjectileMesh(id);
    }
  }

  world.flush();
}

function updateSceneFromWorld(world: World, scene: GhostSceneManager, elapsed: number): void {
  for (const id of world.query(['ghost', 'transform'])) {
    const comp = world.get<{ transform: TransformComponent }>(id);
    scene.updateGhostMesh(id, comp.transform.position, elapsed);
  }

  for (const id of world.query(['projectile', 'transform'])) {
    const comp = world.get<{ transform: TransformComponent }>(id);
    scene.updateProjectileMesh(id, comp.transform.position);
  }
}

function updateHUD(world: World, playerId: EntityId): void {
  const player = world.get<{ player: PlayerComponent }>(playerId);
  const scoreEl = document.getElementById('score-value');
  const killsEl = document.getElementById('kills-value');
  const ghostCountEl = document.getElementById('ghost-count');

  if (scoreEl) {
    scoreEl.textContent = String(player.player.score.value);
  }
  if (killsEl) {
    killsEl.textContent = String(player.player.kills);
  }
  if (ghostCountEl) {
    ghostCountEl.textContent = String(world.query(['ghost']).length);
  }
}

function showError(msg: string): void {
  const div = document.createElement('div');
  div.className = 'err';
  div.textContent = msg;
  document.body.appendChild(div);
}

main().catch((err) => {
  console.error('[GhostHunter] Fatal:', err);
  showError(String(err));
});
