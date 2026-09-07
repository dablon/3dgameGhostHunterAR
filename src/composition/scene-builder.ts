import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { EntityId } from '@domain';
import type { GhostType } from '@domain/components';
import type { Position } from '@domain';

export interface GhostEntity {
  id: EntityId;
  root: THREE.Object3D;
  bodyMat: THREE.MeshStandardMaterial;
  glowMat: THREE.SpriteMaterial;
  type: GhostType;
}

export interface ProjectileEntity {
  id: EntityId;
  mesh: THREE.Mesh;
}

const FOG_COLOR = 0x0d1420;

const GHOST_COLORS: Record<GhostType, number> = {
  wisp: 0x00ffcc,
  specter: 0x8844ff,
  poltergeist: 0xff4488,
  banshee: 0xffdd00,
};

const GHOST_SCALES: Record<GhostType, number> = {
  wisp: 0.34,
  specter: 0.46,
  poltergeist: 0.56,
  banshee: 0.72,
};

const GHOST_EMISSIVE: Record<GhostType, number> = {
  wisp: 1.0,
  specter: 1.0,
  poltergeist: 1.0,
  banshee: 0.7,
};

const PROP_NAMES = [
  'gravestone',
  'cross',
  'pillar',
  'rock',
  'tree',
  'fence',
  'gate',
  'mausoleum',
] as const;

type PropName = (typeof PROP_NAMES)[number];

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
  glowTexture.colorSpace = THREE.SRGBColorSpace;
  return glowTexture;
}

let groundTexture: THREE.CanvasTexture | null = null;

function getGroundTexture(): THREE.CanvasTexture {
  if (groundTexture) return groundTexture;
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#232f45';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(12, 18, 30, 0.5)' : 'rgba(52, 66, 92, 0.4)';
    ctx.beginPath();
    ctx.ellipse(
      Math.random() * size,
      Math.random() * size,
      40 + Math.random() * 90,
      30 + Math.random() * 70,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(10, 15, 26, 0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * 90;
      y += (Math.random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let i = 0; i < 5000; i++) {
    const shade = 20 + Math.random() * 40;
    ctx.fillStyle = `rgba(${shade}, ${shade + 12}, ${shade + 28}, ${0.14 + Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }
  groundTexture = new THREE.CanvasTexture(c);
  groundTexture.colorSpace = THREE.SRGBColorSpace;
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(6, 6);
  groundTexture.anisotropy = 4;
  return groundTexture;
}

let skyTexture: THREE.CanvasTexture | null = null;

function getSkyTexture(): THREE.CanvasTexture {
  if (skyTexture) return skyTexture;
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#02030a');
  grad.addColorStop(0.35, '#070d1e');
  grad.addColorStop(0.46, '#16233f');
  grad.addColorStop(0.5, '#2c4066');
  grad.addColorStop(0.54, '#16233c');
  grad.addColorStop(1, '#04060d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  skyTexture = new THREE.CanvasTexture(c);
  skyTexture.colorSpace = THREE.SRGBColorSpace;
  return skyTexture;
}

function loadGLB(url: string): Promise<THREE.Object3D> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout loading ${url}`)), 5000);
    loader.load(
      url,
      (gltf) => {
        clearTimeout(timer);
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function collectGeometries(root: THREE.Object3D): THREE.BufferGeometry[] {
  const geos: THREE.BufferGeometry[] = [];
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) geos.push(mesh.geometry);
  });
  return geos;
}

// ── Procedural fallback props (used when a .glb is missing) ──────────────────

function fallbackGravestone(): THREE.BufferGeometry {
  const slab = new THREE.BoxGeometry(0.5, 0.8, 0.11).translate(0, 0.5, 0);
  const arch = new THREE.CylinderGeometry(0.25, 0.25, 0.11, 16, 1, false, 0, Math.PI)
    .rotateX(-Math.PI / 2)
    .rotateY(Math.PI / 2)
    .translate(0, 0.9, 0);
  const plinth = new THREE.BoxGeometry(0.42, 0.1, 0.16).translate(0, 0.05, 0);
  return mergeGeometries([slab, arch, plinth])!;
}

function fallbackCross(): THREE.BufferGeometry {
  const stem = new THREE.BoxGeometry(0.08, 0.92, 0.07).translate(0, 0.6, 0);
  const arm = new THREE.BoxGeometry(0.42, 0.07, 0.07).translate(0, 0.78, 0);
  const base = new THREE.BoxGeometry(0.32, 0.14, 0.16).translate(0, 0.07, 0);
  return mergeGeometries([stem, arm, base])!;
}

function fallbackPillar(): THREE.BufferGeometry {
  const column = new THREE.CylinderGeometry(0.18, 0.2, 1.35, 14).translate(0, 0.82, 0);
  const base = new THREE.BoxGeometry(0.52, 0.14, 0.52).translate(0, 0.07, 0);
  const cap = new THREE.BoxGeometry(0.46, 0.12, 0.46).translate(0, 0.26, 0);
  return mergeGeometries([column, base, cap])!;
}

function fallbackRock(): THREE.BufferGeometry {
  return new THREE.DodecahedronGeometry(0.6, 0)
    .scale(1.15, 0.62, 0.9)
    .translate(0, 0.34, 0);
}

function fallbackTree(): THREE.BufferGeometry {
  const parts = [
    new THREE.CylinderGeometry(0.09, 0.24, 2.5, 8).translate(0, 1.25, 0),
    new THREE.CylinderGeometry(0.03, 0.09, 1.2, 6)
      .rotateZ(0.9)
      .translate(0.45, 2.0, 0),
    new THREE.CylinderGeometry(0.03, 0.08, 1.0, 6)
      .rotateZ(-1.0)
      .rotateY(0.8)
      .translate(-0.4, 1.8, 0.2),
    new THREE.CylinderGeometry(0.02, 0.07, 0.9, 6)
      .rotateX(0.8)
      .translate(0.1, 2.2, 0.5),
  ];
  return mergeGeometries(parts)!;
}

function fallbackFence(): THREE.BufferGeometry {
  const postL = new THREE.BoxGeometry(0.09, 0.9, 0.09).translate(-0.7, 0.45, 0);
  const postR = new THREE.BoxGeometry(0.09, 0.9, 0.09).translate(0.7, 0.45, 0);
  const railA = new THREE.BoxGeometry(1.55, 0.08, 0.055).translate(0, 0.32, 0);
  const railB = new THREE.BoxGeometry(1.55, 0.08, 0.055).translate(0, 0.68, 0);
  return mergeGeometries([postL, postR, railA, railB])!;
}

function fallbackGate(): THREE.BufferGeometry {
  const postL = new THREE.CylinderGeometry(0.17, 0.2, 2.2, 10).translate(-1.15, 1.1, 0);
  const postR = new THREE.CylinderGeometry(0.17, 0.2, 2.2, 10).translate(1.15, 1.1, 0);
  const lintel = new THREE.BoxGeometry(2.75, 0.26, 0.22).translate(0, 2.32, 0);
  const finL = new THREE.ConeGeometry(0.12, 0.24, 8).translate(-1.15, 2.55, 0);
  const finR = new THREE.ConeGeometry(0.12, 0.24, 8).translate(1.15, 2.55, 0);
  return mergeGeometries([postL, postR, lintel, finL, finR])!;
}

function fallbackMausoleum(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(2.7, 0.26, 2.1).translate(0, 0.13, 0);
  const body = new THREE.BoxGeometry(2.3, 1.4, 1.7).translate(0, 0.96, 0);
  const roof = new THREE.ConeGeometry(1.85, 0.95, 4)
    .rotateY(Math.PI / 4)
    .translate(0, 2.13, 0);
  const door = new THREE.BoxGeometry(0.56, 0.95, 0.08).translate(0, 0.62, 0.87);
  return mergeGeometries([base, body, roof, door])!;
}

function fallbackProp(name: PropName): THREE.BufferGeometry {
  switch (name) {
    case 'gravestone':
      return fallbackGravestone();
    case 'cross':
      return fallbackCross();
    case 'pillar':
      return fallbackPillar();
    case 'rock':
      return fallbackRock();
    case 'tree':
      return fallbackTree();
    case 'fence':
      return fallbackFence();
    case 'gate':
      return fallbackGate();
    case 'mausoleum':
      return fallbackMausoleum();
  }
}

// ── Manager ──────────────────────────────────────────────────────────────────

export class GhostSceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private ghostMeshes: Map<EntityId, GhostEntity> = new Map();
  private projectileMeshes: Map<EntityId, ProjectileEntity> = new Map();
  private ghostGroup: THREE.Group;
  private projectileGroup: THREE.Group;
  private clock: THREE.Clock;
  private weapon: THREE.Group;
  private muzzle: THREE.Sprite;
  private flashAt = -1e9;
  private dust: THREE.Points;
  private mists: THREE.Mesh[] = [];
  private ghostTemplate: THREE.Object3D | null = null;
  private ghostEyeMat: THREE.MeshStandardMaterial;

  constructor(canvas: HTMLCanvasElement) {
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(FOG_COLOR);
    this.scene.fog = new THREE.Fog(FOG_COLOR, 8, 34);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 1.6, 5);
    this.scene.add(this.camera);

    this.ghostEyeMat = new THREE.MeshStandardMaterial({
      color: 0x0c1220,
      roughness: 0.35,
      emissive: 0xcfe8ff,
      emissiveIntensity: 1.5,
    });

    this.buildLights();
    this.buildSky();
    this.buildStars();
    this.buildMoon();
    this.buildGround();
    this.buildMist();
    this.dust = this.buildDust();

    this.ghostGroup = new THREE.Group();
    this.ghostGroup.name = 'ghosts';
    this.scene.add(this.ghostGroup);

    this.projectileGroup = new THREE.Group();
    this.projectileGroup.name = 'projectiles';
    this.scene.add(this.projectileGroup);

    const weaponParts = this.buildWeapon();
    this.weapon = weaponParts.group;
    this.muzzle = weaponParts.muzzle;

    this.buildHUD();

    const bufferSize = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(bufferSize);
    const renderTarget = new THREE.WebGLRenderTarget(bufferSize.x, bufferSize.y, {
      samples: 4,
      type: THREE.HalfFloatType,
    });
    this.composer = new EffectComposer(this.renderer, renderTarget);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5,
      0.45,
      0.72,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.setPixelRatio(this.renderer.getPixelRatio());

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      console.error('[GhostHunter] WebGL context lost — rendering suspended');
      this.stopLoop();
    });
  }

  private buildLights(): void {
    const ambient = new THREE.AmbientLight(0x55637f, 1.0);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x7284a8, 0x0e141f, 0.7);
    this.scene.add(hemi);

    const moonlight = new THREE.DirectionalLight(0xbfd4ff, 2.2);
    moonlight.position.set(-18, 26, -30);
    moonlight.castShadow = true;
    moonlight.shadow.mapSize.set(2048, 2048);
    moonlight.shadow.camera.left = -26;
    moonlight.shadow.camera.right = 26;
    moonlight.shadow.camera.top = 26;
    moonlight.shadow.camera.bottom = -26;
    moonlight.shadow.camera.near = 1;
    moonlight.shadow.camera.far = 90;
    moonlight.shadow.bias = -0.0004;
    this.scene.add(moonlight);

    const ember = new THREE.DirectionalLight(0xffa864, 0.5);
    ember.position.set(14, 9, 20);
    this.scene.add(ember);

    const cyan = new THREE.PointLight(0x6ad4ff, 40, 30, 1.6);
    cyan.position.set(0, 3, 0);
    this.scene.add(cyan);

    const violet = new THREE.PointLight(0x7a4dff, 22, 24, 1.8);
    violet.position.set(-9, 4.5, -7);
    this.scene.add(violet);
  }

  private buildSky(): void {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(92, 32, 20),
      new THREE.MeshBasicMaterial({
        map: getSkyTexture(),
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    );
    sky.name = 'sky';
    this.scene.add(sky);
  }

  private buildStars(): void {
    const count = 900;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const y = 0.06 + Math.random() * 0.94;
      const rxz = Math.sqrt(Math.max(0, 1 - y * y));
      positions[i * 3] = Math.cos(theta) * rxz * 88;
      positions[i * 3 + 1] = y * 88;
      positions[i * 3 + 2] = Math.sin(theta) * rxz * 88;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: getGlowTexture(),
        color: 0xcfe2ff,
        size: 2.2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.85,
        fog: false,
        depthWrite: false,
      }),
    );
    stars.name = 'stars';
    this.scene.add(stars);
  }

  private buildMoon(): void {
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(3.4, 24, 16),
      new THREE.MeshBasicMaterial({ fog: false }),
    );
    (moon.material as THREE.MeshBasicMaterial).color.setRGB(1.7, 1.8, 2.1);
    moon.position.set(-28, 34, -60);
    moon.name = 'moon';
    this.scene.add(moon);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0xbfd4ff,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    halo.scale.setScalar(14);
    halo.position.copy(moon.position);
    this.scene.add(halo);
  }

  private buildGround(): void {
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(26, 64),
      new THREE.MeshStandardMaterial({
        map: getGroundTexture(),
        roughness: 0.95,
        metalness: 0,
      }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    this.scene.add(ground);
  }

  private buildMist(): void {
    for (let i = 0; i < 6; i++) {
      const mist = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: getGlowTexture(),
          color: 0x6ad4ff,
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
        }),
      );
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 10;
      mist.rotation.x = -Math.PI / 2;
      mist.position.set(Math.cos(angle) * radius, 0.25 + Math.random() * 0.5, Math.sin(angle) * radius);
      mist.scale.setScalar(13 + Math.random() * 11);
      mist.userData.spin = (Math.random() > 0.5 ? 1 : -1) * (0.015 + Math.random() * 0.02);
      this.mists.push(mist);
      this.scene.add(mist);
    }
  }

  private buildDust(): THREE.Points {
    const count = 260;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = Math.random() * 7;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 34;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        map: getGlowTexture(),
        color: 0x9fd8ff,
        size: 0.09,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    dust.name = 'dust';
    this.scene.add(dust);
    return dust;
  }

  private buildWeapon(): { group: THREE.Group; muzzle: THREE.Sprite } {
    const metal = new THREE.MeshStandardMaterial({
      color: 0x39465e,
      roughness: 0.45,
      metalness: 0.75,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: 0x232c3d,
      roughness: 0.6,
      metalness: 0.5,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x4a5a78,
      roughness: 0.7,
      metalness: 0.2,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0x0a2a33,
      emissive: 0x6ad4ff,
      emissiveIntensity: 1.4,
      roughness: 0.4,
    });

    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.13, 0.46), dark);
    body.position.set(0, 0, -0.1);
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.3), metal);
    top.position.set(0, 0.085, -0.12);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.09), metal);
    grip.position.set(0, -0.12, 0.06);
    grip.rotation.x = 0.35;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.4, 10), metal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.01, -0.42);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 18), glowMat);
    ring.position.set(0, 0.01, -0.5);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.094, 0.02, 0.2), glowMat);
    strip.position.set(0, 0.02, 0.02);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.44, 10), gloveMat);
    forearm.rotation.x = Math.PI / 2 - 0.42;
    forearm.position.set(0.015, -0.11, 0.14);
    const glove = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.13), gloveMat);
    glove.position.set(0, -0.07, 0.03);
    glove.rotation.x = 0.35;

    group.add(body, top, grip, barrel, ring, strip, forearm, glove);

    const muzzle = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0x9ffce0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    muzzle.scale.setScalar(0.34);
    muzzle.position.set(0, 0.01, -0.66);
    group.add(muzzle);

    group.position.set(0.27, -0.21, -0.55);
    group.rotation.y = -0.08;
    this.camera.add(group);
    return { group, muzzle };
  }

  private addInstances(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    spots: Array<{ x: number; z: number; rot: number; scale: number }>,
    tilt = 0.06,
  ): void {
    const instanced = new THREE.InstancedMesh(geometry, material, spots.length);
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const pos = new THREE.Vector3();
    const scl = new THREE.Vector3();
    spots.forEach((spot, i) => {
      euler.set((Math.random() - 0.5) * tilt, spot.rot, (Math.random() - 0.5) * tilt);
      quat.setFromEuler(euler);
      pos.set(spot.x, 0, spot.z);
      scl.set(spot.scale, spot.scale * (0.85 + Math.random() * 0.35), spot.scale);
      matrix.compose(pos, quat, scl);
      instanced.setMatrixAt(i, matrix);
    });
    instanced.instanceMatrix.needsUpdate = true;
    instanced.castShadow = true;
    instanced.receiveShadow = true;
    this.scene.add(instanced);
  }

  private scatter(count: number, minR: number, maxR: number, scaleMin = 0.85, scaleMax = 1.25) {
    const spots: Array<{ x: number; z: number; rot: number; scale: number }> = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = minR + Math.random() * (maxR - minR);
      spots.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        rot: Math.random() * Math.PI * 2,
        scale: scaleMin + Math.random() * (scaleMax - scaleMin),
      });
    }
    return spots;
  }

  private buildProps(geometry: Partial<Record<PropName, THREE.BufferGeometry>>): void {
    const stone = new THREE.MeshStandardMaterial({ color: 0x9aa7b8, roughness: 0.92 });
    const stoneDark = new THREE.MeshStandardMaterial({ color: 0x76839a, roughness: 0.95 });
    const bark = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x3d3026, roughness: 1 });

    const get = (name: PropName): THREE.BufferGeometry =>
      geometry[name] ?? fallbackProp(name);

    this.addInstances(get('gravestone'), stone, this.scatter(48, 6.5, 17));
    this.addInstances(get('gravestone'), stone, this.scatter(14, 4.5, 6.5));
    this.addInstances(get('cross'), stoneDark, this.scatter(20, 6, 16));
    this.addInstances(get('pillar'), stone, this.scatter(10, 9, 14, 0.9, 1.4));
    this.addInstances(get('rock'), stoneDark, this.scatter(34, 4, 18, 0.5, 1.5));
    this.addInstances(get('tree'), bark, this.scatter(12, 12.5, 18, 0.9, 1.3));

    const spawnFraming: Array<[number, number, number, number]> = [
      [-1.6, -3.2, 0.3, 1.0],
      [1.8, -3.8, -0.2, 0.9],
      [-2.6, -5.5, 0.8, 1.15],
      [2.4, -6.2, -0.5, 1.0],
      [0.9, -7.5, 0.15, 1.2],
      [-1.2, -8.2, -0.3, 0.95],
    ];
    for (const [x, z, rotY, scale] of spawnFraming) {
      const marker = new THREE.Mesh(get('gravestone'), stone);
      marker.position.set(x, 0, z);
      marker.rotation.set(
        (Math.random() - 0.5) * 0.12,
        rotY,
        (Math.random() - 0.5) * 0.14,
      );
      marker.scale.setScalar(scale);
      marker.castShadow = true;
      marker.receiveShadow = true;
      this.scene.add(marker);
    }

    const crossFraming: Array<[number, number, number]> = [
      [-3.8, -4.5, 0.4],
      [3.6, -5.8, -0.5],
    ];
    for (const [x, z, rotY] of crossFraming) {
      const cross = new THREE.Mesh(get('cross'), stoneDark);
      cross.position.set(x, 0, z);
      cross.rotation.y = rotY;
      cross.castShadow = true;
      cross.receiveShadow = true;
      this.scene.add(cross);
    }

    const fenceSpots: Array<{ x: number; z: number; rot: number; scale: number }> = [];
    const fenceCount = 56;
    for (let i = 0; i < fenceCount; i++) {
      const angle = (i / fenceCount) * Math.PI * 2;
      fenceSpots.push({
        x: Math.cos(angle) * 19.2,
        z: Math.sin(angle) * 19.2,
        rot: angle + Math.PI / 2,
        scale: 1,
      });
    }
    this.addInstances(get('fence'), wood, fenceSpots, 0);

    const gates: Array<[number, number, number, number]> = [
      [0, -9, 0, 1.15],
      [11, 7, -2.2, 1.0],
    ];
    for (const [x, z, rotY, scale] of gates) {
      const gate = new THREE.Mesh(get('gate'), stone);
      gate.position.set(x, 0, z);
      gate.rotation.y = rotY;
      gate.scale.setScalar(scale);
      gate.castShadow = true;
      gate.receiveShadow = true;
      this.scene.add(gate);
    }

    const mausoleumAngles = [Math.PI / 6, (5 * Math.PI) / 6, (3 * Math.PI) / 2];
    for (const angle of mausoleumAngles) {
      const radius = 13.5;
      const m = new THREE.Mesh(get('mausoleum'), stone);
      m.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      m.rotation.y = Math.atan2(m.position.x, m.position.z) + Math.PI;
      m.scale.setScalar(1.25);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
    }
  }

  async loadWorldAssets(): Promise<void> {
    const results = await Promise.allSettled(
      PROP_NAMES.map((name) => loadGLB(`/assets/models/${name}.glb`)),
    );
    const geometry: Partial<Record<PropName, THREE.BufferGeometry>> = {};
    results.forEach((result, i) => {
      const name = PROP_NAMES[i];
      if (!name) return;
      if (result.status === 'fulfilled') {
        const [geo] = collectGeometries(result.value);
        if (geo) geometry[name] = geo;
      } else {
        console.warn(`[GhostHunter] prop ${name} failed to load, using fallback`);
      }
    });
    this.buildProps(geometry);

    try {
      this.ghostTemplate = await loadGLB('/assets/models/ghost.glb');
    } catch {
      console.warn('[GhostHunter] ghost model unavailable, using fallback mesh');
      this.ghostTemplate = null;
    }
  }

  private buildHUD(): void {
    const hud = document.getElementById('hud');
    if (hud) hud.removeAttribute('hidden');
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  }

  async initAR(): Promise<void> {
    try {
      const video = document.createElement('video');
      video.style.display = 'none';
      document.body.appendChild(video);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      video.srcObject = stream;
      await video.play();

      this.scene.background = null;
      console.info('[GhostHunter] AR mode initialized (camera passthrough)');
    } catch (err) {
      console.warn('[GhostHunter] AR camera unavailable, using fallback mode:', err);
    }
  }

  spawnGhostMesh(id: EntityId, type: GhostType, position: Position): THREE.Object3D {
    const color = GHOST_COLORS[type];
    const scale = GHOST_SCALES[type];
    const root = new THREE.Group();

    let bodyMat: THREE.MeshStandardMaterial;
    let glowMat: THREE.SpriteMaterial;

    if (this.ghostTemplate) {
      const clone = this.ghostTemplate.clone();
      bodyMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: GHOST_EMISSIVE[type],
        transparent: true,
        opacity: 0.72,
        roughness: 0.35,
        metalness: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      clone.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (/GhostBody/i.test(mesh.name)) {
          mesh.material = bodyMat;
        } else {
          mesh.material = this.ghostEyeMat;
        }
      });
      clone.scale.setScalar(scale);
      clone.userData.owns = false;
      root.add(clone);
    } else {
      const s = scale * 1.5;
      const profile = [
        new THREE.Vector2(0.001, s * 1.5),
        new THREE.Vector2(s * 0.5, s * 1.25),
        new THREE.Vector2(s * 0.95, s * 0.55),
        new THREE.Vector2(s, s * 0.1),
        new THREE.Vector2(s * 0.9, -s * 0.45),
        new THREE.Vector2(s * 0.95, -s * 0.9),
        new THREE.Vector2(s * 0.55, -s * 1.1),
        new THREE.Vector2(s * 0.8, -s * 1.4),
        new THREE.Vector2(s * 0.3, -s * 1.55),
      ];
      const geometry = new THREE.LatheGeometry(profile, 22);
      bodyMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: GHOST_EMISSIVE[type],
        transparent: true,
        opacity: 0.72,
        roughness: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const body = new THREE.Mesh(geometry, bodyMat);
      body.userData.owns = true;
      root.add(body);
    }

    glowMat = new THREE.SpriteMaterial({
      map: getGlowTexture(),
      color,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.setScalar(scale * 3.4);
    root.add(glow);

    root.position.set(position.x, position.y, position.z);
    this.ghostGroup.add(root);
    this.ghostMeshes.set(id, { id, root, bodyMat, glowMat, type });
    return root;
  }

  removeGhostMesh(id: EntityId): void {
    const entity = this.ghostMeshes.get(id);
    if (!entity) return;
    entity.root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.userData.owns) mesh.geometry.dispose();
      const mat = (obj as THREE.Mesh).material as THREE.Material | undefined;
      if (mat && mat !== this.ghostEyeMat && !(obj as THREE.Sprite).isSprite) mat.dispose();
      const sprite = obj as THREE.Sprite;
      if (sprite.isSprite) (sprite.material as THREE.SpriteMaterial).dispose();
    });
    entity.bodyMat.dispose();
    this.ghostGroup.remove(entity.root);
    this.ghostMeshes.delete(id);
  }

  spawnProjectileMesh(id: EntityId, position: Position): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.09, 10, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0x7dffc9,
      emissive: 0x7dffc9,
      emissiveIntensity: 2.2,
    });

    const mesh = new THREE.Mesh(geometry, material);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0x7dffc9,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(0.55);
    mesh.add(glow);
    mesh.position.set(position.x, position.y, position.z);
    this.projectileGroup.add(mesh);
    this.projectileMeshes.set(id, { id, mesh });
    this.flashAt = performance.now();
    return mesh;
  }

  removeProjectileMesh(id: EntityId): void {
    const entity = this.projectileMeshes.get(id);
    if (entity) {
      entity.mesh.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | undefined;
        if (mat) mat.dispose();
        const sprite = obj as THREE.Sprite;
        if (sprite.isSprite) (sprite.material as THREE.SpriteMaterial).dispose();
      });
      this.projectileGroup.remove(entity.mesh);
      this.projectileMeshes.delete(id);
    }
  }

  updateGhostMesh(id: EntityId, position: Position, elapsed: number): void {
    const entity = this.ghostMeshes.get(id);
    if (!entity) return;

    const bob = Math.sin(elapsed * 3) * 0.06;
    entity.root.position.set(position.x, position.y + bob, position.z);
    entity.root.rotation.y = Math.sin(elapsed * 0.8 + id) * 1.1;
    entity.root.rotation.z = Math.sin(elapsed * 1.6 + id) * 0.07;

    const dist = entity.root.position.distanceTo(this.camera.position);
    const near = THREE.MathUtils.clamp((dist - 0.8) / 2.2, 0.3, 1);
    entity.glowMat.opacity = 0.28 * near;
    entity.bodyMat.opacity = (0.62 + Math.sin(elapsed * 4 + id) * 0.12) * near;
  }

  updateProjectileMesh(id: EntityId, position: Position): void {
    const entity = this.projectileMeshes.get(id);
    if (entity) {
      entity.mesh.position.set(position.x, position.y, position.z);
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

  updateEffects(elapsed: number): void {
    const bobY = Math.sin(elapsed * 1.7) * 0.006;
    const swayX = Math.cos(elapsed * 1.1) * 0.004;
    this.weapon.position.set(0.27 + swayX, -0.21 + bobY, -0.55);
    this.weapon.rotation.z = swayX * 0.5;

    const flashAge = performance.now() - this.flashAt;
    (this.muzzle.material as THREE.SpriteMaterial).opacity =
      Math.max(0, 1 - flashAge / 130) * 0.7;

    this.dust.rotation.y = elapsed * 0.012;
    for (const mist of this.mists) {
      mist.rotation.z = (mist.userData.spin as number) * elapsed;
    }
  }

  render(): void {
    this.composer.render();
  }

  startLoop(onFrame: (dt: number) => void): void {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      onFrame(dt);
      this.render();
    });
  }

  stopLoop(): void {
    this.renderer.setAnimationLoop(null);
  }

  dispose(): void {
    this.stopLoop();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.composer.dispose();
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
    this.composer.setSize(width, height);
    this.bloom.setSize(width, height);
  }

  get cameraObject(): THREE.PerspectiveCamera {
    return this.camera;
  }

  get sceneObject(): THREE.Scene {
    return this.scene;
  }
}
