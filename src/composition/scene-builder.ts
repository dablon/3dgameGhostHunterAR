import * as THREE from 'three';
import type { EntityId } from '@domain';
import type { GhostType } from '@domain/components';
import type { Position } from '@domain';

export interface GhostEntity {
  id: EntityId;
  mesh: THREE.Mesh;
  type: GhostType;
  points: number;
}

export interface ProjectileEntity {
  id: EntityId;
  mesh: THREE.Mesh;
}

const GHOST_COLORS: Record<GhostType, number> = {
  wisp: 0x00ffcc,
  specter: 0x8844ff,
  poltergeist: 0xff4488,
  banshee: 0xffdd00,
};

const GHOST_SIZES: Record<GhostType, number> = {
  wisp: 0.25,
  specter: 0.45,
  poltergeist: 0.55,
  banshee: 0.7,
};

const FOG_COLOR = 0x0d1420;
let glowTexture: THREE.CanvasTexture | null = null;

function getGlowTexture(): THREE.CanvasTexture {
  if (glowTexture) return glowTexture;
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.4)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

export class GhostSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private ghostMeshes: Map<EntityId, THREE.Mesh> = new Map();
  private projectileMeshes: Map<EntityId, THREE.Mesh> = new Map();
  private ghostGroup: THREE.Group;
  private projectileGroup: THREE.Group;
  private clock: THREE.Clock;

  constructor(canvas: HTMLCanvasElement) {
    this.clock = new THREE.Clock();

    // Three.js renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // Main scene (used for both non-AR and AR)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(FOG_COLOR);
    this.scene.fog = new THREE.Fog(FOG_COLOR, 12, 42);

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 1.6, 5);

    // Lighting
    const ambient = new THREE.AmbientLight(0x667799, 1.4);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x8899bb, 0x1a2233, 0.9);
    this.scene.add(hemi);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6ad4ff, 40, 30, 1.6);
    pointLight.position.set(0, 3, 0);
    this.scene.add(pointLight);

    // Groups for game objects
    this.ghostGroup = new THREE.Group();
    this.ghostGroup.name = 'ghosts';
    this.scene.add(this.ghostGroup);

    this.projectileGroup = new THREE.Group();
    this.projectileGroup.name = 'projectiles';
    this.scene.add(this.projectileGroup);

    // Grid floor
    const grid = new THREE.GridHelper(40, 40, 0x3a6a99, 0x223349);
    (grid.material as THREE.Material).opacity = 0.6;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    // HUD elements
    this.buildHUD();
  }

  private buildHUD(): void {
    const hud = document.getElementById('hud');
    if (hud) hud.removeAttribute('hidden');
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  }

  async initAR(): Promise<void> {
    try {
      // Try to initialize AR.js camera
      const video = document.createElement('video');
      video.style.display = 'none';
      document.body.appendChild(video);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      video.srcObject = stream;
      await video.play();

      // Camera passthrough AR — Three.js renders transparently over live camera feed
      // For now, keep Three.js scene with camera passthrough
      // The actual AR ghost overlay happens via transparent renderer over video
      document.body.style.background = 'transparent';

      console.info('[GhostHunter] AR mode initialized (camera passthrough)');
    } catch (err) {
      console.warn('[GhostHunter] AR camera unavailable, using fallback mode:', err);
    }
  }

  spawnGhostMesh(id: EntityId, type: GhostType, position: Position): THREE.Mesh {
    const size = GHOST_SIZES[type];
    const color = GHOST_COLORS[type];

    const geometry = new THREE.SphereGeometry(size, 16, 12);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.85,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.castShadow = true;

    // Ghostly trail effect — soft radial glow sprite
    const glowMat = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(size * 3);
    mesh.add(glow);

    this.ghostGroup.add(mesh);
    this.ghostMeshes.set(id, mesh);
    return mesh;
  }

  removeGhostMesh(id: EntityId): void {
    const mesh = this.ghostMeshes.get(id);
    if (mesh) {
      this.ghostGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.ghostMeshes.delete(id);
    }
  }

  spawnProjectileMesh(id: EntityId, position: Position): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.08, 8, 6);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 2.0,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    this.projectileGroup.add(mesh);
    this.projectileMeshes.set(id, mesh);
    return mesh;
  }

  removeProjectileMesh(id: EntityId): void {
    const mesh = this.projectileMeshes.get(id);
    if (mesh) {
      this.projectileGroup.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.projectileMeshes.delete(id);
    }
  }

  updateGhostMesh(id: EntityId, position: Position, elapsed: number): void {
    const mesh = this.ghostMeshes.get(id);
    if (!mesh) return;

    mesh.position.set(position.x, position.y, position.z);

    // Bobbing animation
    const bob = Math.sin(elapsed * 3) * 0.05;
    mesh.position.y += bob;

    // Ghostly rotation
    mesh.rotation.y = elapsed * 1.5;
    mesh.rotation.x = Math.sin(elapsed * 2) * 0.1;

    // Pulsing opacity
    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.7 + Math.sin(elapsed * 4) * 0.15;
  }

  updateProjectileMesh(id: EntityId, position: Position): void {
    const mesh = this.projectileMeshes.get(id);
    if (mesh) {
      mesh.position.set(position.x, position.y, position.z);
    }
  }

  updateCameraFromInput(
    yaw: number,
    pitch: number,
    position: { x: number; y: number; z: number },
  ): void {
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = yaw;
    this.camera.rotation.x = pitch;
    this.camera.position.set(position.x, position.y, position.z);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  startLoop(onFrame: (dt: number) => void): void {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05); // cap at 50ms
      onFrame(dt);
      this.render();
    });
  }

  stopLoop(): void {
    this.renderer.setAnimationLoop(null);
  }

  dispose(): void {
    this.stopLoop();
    this.renderer.dispose();
  }

  getSize(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  handleResize(): void {
    const { width, height } = this.getSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  get cameraObject(): THREE.PerspectiveCamera {
    return this.camera;
  }

  get sceneObject(): THREE.Scene {
    return this.scene;
  }
}
