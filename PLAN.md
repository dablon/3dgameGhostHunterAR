# PLAN: AR Ghost Hunter Game

## 1. Concept

**Juego de "Caza de fantasmas" con realidad aumentada** is an immersive AR experience where players hunt virtual ghosts in their real-world environment using their device camera. The game leverages AR.js to overlay translucent, glowing ghost models onto the player's surroundings, detected via marker-based or markerless tracking.

**Core Gameplay Loop:**
- Player opens app → AR camera activates → Ghosts spawn in the environment
- Player taps on ghosts to "capture" them, scoring points
- Ghosts move unpredictably (float, dart, fade) to create challenge
- Timer-based waves with increasing difficulty (more ghosts, faster movement)
- Game ends when timer expires or player quits
- Final score displayed with option to play again

**Target Experience:** Spooky-casual, family-friendly horror-lite aesthetic with glowing neon ghosts against real-world backgrounds.

---

## 2. Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **3D Engine** | Three.js r160+ | Industry standard for WebGL, excellent AR.js integration |
| **AR Framework** | AR.js 3.4+ (A-Frame backend) | Marker-based AR with Hiro/QR pattern + markerless plane detection |
| **Build Tool** | Vite 5.x | Fast HMR, ESM-native, excellent TS support |
| **Language** | TypeScript 5.x | Type safety, better DX, Three.js has first-class TS types |
| **3D Assets** | Blender 4.x + glTF | Industry standard, glTF is optimized for web delivery |
| **Audio** | Web Audio API | Native browser, low latency for sound effects |
| **State Management** | Zustand | Minimal, hooks-based, perfect for game state |
| **Styling** | CSS Modules | Scoped styles, no framework bloat |

---

## 3. GAME SCREENS

### Screen 1: Main Menu
```
┌─────────────────────────────────────┐
│                                     │
│         👻 GHOST HUNTER 👻          │
│            (3D animated title)       │
│                                     │
│    ┌─────────────────────────┐      │
│    │      ▶ START GAME       │      │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────┐      │
│    │      📋 HOW TO PLAY     │      │
│    └─────────────────────────────┘  │
│                                     │
│    ┌─────────────────────────┐      │
│    │      ⚙️ SETTINGS        │      │
│    └─────────────────────────────┘  │
│                                     │
│         [AR permission prompt]       │
└─────────────────────────────────────┘
```
- **Background:** Subtle floating ghost silhouettes over dark gradient
- **Title:** 3D text with glow effect, slight floating animation
- **Buttons:** Rounded rectangles with ghost-blue accent (#00FFFF)
- **Controls:** Tap/click to navigate

### Screen 2: How To Play (Modal)
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗  │
│  ║     HOW TO PLAY               ║  │
│  ╠═══════════════════════════════╣  │
│  ║  👻 Ghosts appear in your      ║  │
│  ║     camera view               ║  │
│  ║                               ║  │
│  ║  👆 Tap ghosts to capture     ║  │
│  ║     them and score points     ║  │
│  ║                               ║  │
│  ║  ⏱️  Catch as many as you     ║  │
│  ║     can in 60 seconds         ║  │
│  ║                               ║  │
│  ║  ⚡ Bonus points for fast     ║  │
│  ║     consecutive captures      ║  │
│  ║                               ║  │
│  ║       [GOT IT!]               ║  │
│  ╚═══════════════════════════════╝  │
└─────────────────────────────────────┘
```

### Screen 3: Game HUD (In-Play)
```
┌─────────────────────────────────────┐
│ SCORE: 1250        ⏱️ 00:45        │
│                                     │
│                                     │
│     👻        [AR CAMERA VIEW]      │
│           👻                        │
│                      👻             │
│                                     │
│                                     │
│ COMBO: x3 🔥      GHOSTS: 8/12      │
└─────────────────────────────────────┘
```
- **Top HUD:** Score (left), Timer (right) — semi-transparent dark bar
- **Bottom HUD:** Combo multiplier, ghost counter — minimal, non-intrusive
- **Ghosts:** Semi-transparent, glowing, floating models in AR space
- **Controls:** Tap on ghost to capture (haptic feedback if available)

### Screen 4: Wave Complete (Brief Overlay)
```
┌─────────────────────────────────────┐
│                                     │
│          WAVE 1 COMPLETE!           │
│                                     │
│        Caught: 10/12 ghosts         │
│        Bonus: +500                  │
│                                     │
│         [NEXT WAVE →]               │
│                                     │
└─────────────────────────────────────┘
```
- Appears for 3 seconds between waves

### Screen 5: Game Over
```
┌─────────────────────────────────────┐
│                                     │
│          GAME OVER                  │
│                                     │
│         FINAL SCORE                 │
│            3,450                    │
│                                     │
│    🏆 Best Combo: x5                │
│    👻 Ghosts Caught: 28             │
│    ⭐ Accuracy: 78%                │
│                                     │
│    ┌─────────────────────────┐      │
│    │      🔄 PLAY AGAIN      │      │
│    └─────────────────────────┘      │
│                                     │
│    ┌─────────────────────────┐      │
│    │       🏠 MENU          │      │
│    └─────────────────────────┘      │
│                                     │
└─────────────────────────────────────┘
```
- **Background:** Dark with particle effects
- **Stats:** Animated count-up for score

### Screen 6: Settings
```
┌─────────────────────────────────────┐
│  ╔═══════════════════════════════╗  │
│  ║  ⚙️ SETTINGS                  ║  │
│  ╠═══════════════════════════════╣  │
│  ║  Ghost Difficulty: [●○○○]      ║  │
│  ║                               ║  │
│  ║  Sound Effects: [ON]           ║  │
│  ║  Music: [OFF]                  ║  │
│  ║  Haptic Feedback: [ON]         ║  │
│  ║  Ghost Size: [MEDIUM]          ║  │
│  ║                               ║  │
│  ║       [SAVE] [CANCEL]          ║  │
│  ╚═══════════════════════════════╝  │
└─────────────────────────────────────┘
```

---

## 4. GAME FLOWS

### Main Flow: Start → Play → Game Over → Restart
```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ MAIN MENU│────▶│  HOW TO  │────▶│  GAMEPLAY│────▶│GAME OVER │
└──────────┘     │  PLAY    │     │  (WAVES) │     └──────────┘
     │           └──────────┘     │          │
     │              │            │          ▼
     │              │            │    Wave Complete
     │              │            │      Overlay
     ▼              ▼            │
┌──────────┐     ┌──────────┐    │
│ SETTINGS │     │  START   │◀───┘
└──────────┘     │  GAME    │ (if quit)
                 └──────────┘
```

### Detailed Gameplay Loop (Per Wave)
```
1. WAVE START
   ├── Display "Wave X" overlay (2s)
   ├── Spawn ghost count = 8 + (wave * 2)
   ├── Start wave timer = 15 seconds
   └── Enable AR tracking

2. ACTIVE PLAY (per ghost)
   ├── Ghost spawns at random AR position
   ├── Ghost AI: float (sine wave), occasionally dart
   ├── Ghost lifetime: 8-12 seconds before fade
   ├── Player taps ghost hitbox
   ├── If HIT:
   │   ├── Play capture sound + particle burst
   │   ├── Add points (base 100 × combo multiplier)
   │   ├── Increment combo counter
   │   └── Remove ghost
   └── If MISS:
       ├── Combo resets to x1
       └── Subtle miss feedback

3. WAVE END CONDITIONS
   ├── Timer expires → Wave Complete
   ├── All ghosts caught → Bonus time!
   └── 3 ghosts escape → Lose life (3 lives total)

4. BETWEEN WAVES
   ├── Show Wave Complete overlay (3s)
   ├── Add time bonus if all caught
   └── Auto-advance to next wave

5. GAME OVER TRIGGER
   ├── All lives lost OR
   └── Player manually quits
   └── Transition to Game Over screen
```

### Input Mapping
| Input | Action |
|-------|--------|
| Tap/Click on ghost | Capture ghost |
| Tap outside ghost | Miss (combo break) |
| Device back/swipe down | Pause game |
| Pause → Resume | Continue |
| Pause → Quit | Return to menu |
| Tap "Play Again" | Restart from Wave 1 |
| Tap "Menu" | Return to Main Menu |

---

## 5. BLENDER MODEL PROPOSALS

All models will be exported as `.glb` (binary glTF) for web optimization.

| # | Filename | Description | Dimensions | Polycount | Materials | Animations |
|---|----------|-------------|------------|-----------|-----------|------------|
| 1 | `ghost_basic.glb` | Primary ghost model - classic sheet ghost silhouette with wavy bottom | 1×1.5×0.3 m | ~500 tris | Emissive white, alpha transparency, glow shader | Idle float (z-axis bob), tail wave (vertex animation) |
| 2 | `ghost_angry.glb` | Red-tinted angry ghost variant | 1×1.5×0.3 m | ~500 tris | Emissive red, alpha transparency, angry eyes | Faster idle float, shake animation |
| 3 | `ghost_spirit.glb` | Ethereal wispy ghost - more transparent, particle trail | 1×2×0.2 m | ~400 tris | Heavy alpha, blue emissive, fresnel glow | Fade pulse, drift movement |
| 4 | `ghost_boss.glb` | Large ghost for wave bosses - 2x size, crown/halo | 2×3×0.6 m | ~800 tris | Gold emissive accents, purple body | Aura pulse, dramatic float |
| 5 | `capture_effect.glb` | Particle system mesh for ghost capture | 0.5×0.5×0.5 m | ~200 tris | Bright cyan emissive | Expand + dissolve over 0.5s |
| 6 | `ar_marker_hiro.glb` | 3D representation of AR marker (debug mode) | 0.1×0.1×0.01 m | ~50 tris | Black/white checkerboard texture | None |

### Material Specifications

**Ghost Shader (Custom):**
- Base: Emissive material with color tint
- Transparency: Alpha blend, 0.6-0.9 opacity
- Fresnel rim: Glowing edges
- Vertex animation: Wavy bottom edge (sine displacement)

**Post-Processing (Three.js):**
- Bloom: For ghost glow effect
- Additive blending for ghost transparency

---

## 6. Implementation Steps

### Phase 1: Project Scaffolding
- [ ] Initialize Vite + TypeScript project
- [ ] Install dependencies: three, @ar-js-org/aframe, zustand, etc.
- [ ] Set up folder structure: `src/`, `assets/`, `public/`
- [ ] Create base HTML with AR.js camera setup
- [ ] Configure Vite for GLTF loading and dev server

### Phase 2: Core Three.js Setup
- [ ] Create `SceneManager` class (camera, renderer, lighting)
- [ ] Set up AR.js integration with camera feed
- [ ] Create placeholder ghost mesh (sphere geometry)
- [ ] Implement basic raycasting for tap detection
- [ ] Set up coordinate system matching AR camera

### Phase 3: Game State & UI
- [ ] Create Zustand store for game state (score, lives, wave, combo)
- [ ] Build Main Menu screen with Three.js overlay
- [ ] Build Game HUD (score, timer, combo display)
- [ ] Build Game Over screen with stats
- [ ] Create Settings modal
- [ ] Implement screen transitions

### Phase 4: Ghost System
- [ ] Design ghost spawn system (random AR positions)
- [ ] Implement ghost AI (float, dart, fade behaviors)
- [ ] Create ghost component with health/lifetime
- [ ] Implement capture detection and scoring
- [ ] Add combo system logic
- [ ] Create particle effects for captures

### Phase 5: Wave System
- [ ] Implement wave progression (difficulty scaling)
- [ ] Create wave start/complete overlays
- [ ] Add life system (3 lives)
- [ ] Implement game over conditions
- [ ] Add score persistence (localStorage high score)

### Phase 6: Audio & Polish
- [ ] Add capture sound effects (Web Audio API)
- [ ] Add background music toggle
- [ ] Add haptic feedback on capture (if supported)
- [ ] Implement ghost size settings
- [ ] Add difficulty settings
- [ ] Polish UI animations and transitions

### Phase 7: Blender Asset Pipeline
- [ ] Create `blender/export.py` script
- [ ] Model `ghost_basic.glb` in Blender
- [ ] Model `ghost_angry.glb` variant
- [ ] Model `ghost_spirit.glb` variant
- [ ] Model `ghost_boss.glb` for special waves
- [ ] Create capture effect particle mesh
- [ ] Export all models as optimized GLB

### Phase 8: Build & Validation
- [ ] Run `npm run build` to verify compilation
- [ ] Test AR functionality on mobile device
- [ ] Verify all screens render correctly
- [ ] Test ghost capture on various devices
- [ ] Generate production README with setup instructions
- [ ] Create RUNME.sh and RUNME.bat

---

## Approval Required

**Please review and approve/reject:**

1. ✅ **Concept** — AR ghost hunting with waves, combos, lives
2. ✅ **Tech Stack** — Three.js + AR.js + Vite + TypeScript + Zustand
3. ✅ **Game Screens** — Menu, HUD, Game Over, Settings, How To Play
4. ✅ **Game Flows** — Start → Play (waves) → Game Over → Restart
5. ✅ **Blender Models** — 6 models proposed (ghost variants, effects)
6. ✅ **Implementation Steps** — 8 phases, ordered sequentially

**To proceed:** Approve this plan to begin scaffold phase.

**Any modifications?** Reply with changes needed or "Approved" to continue.
