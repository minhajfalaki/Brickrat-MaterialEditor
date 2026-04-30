# Project Overview

## 1. 3D Library / Renderer

**Plain Three.js v0.174.0** — no React.

- Core library: `lib/three/three.module.js`
- Loaders: `GLTFLoader` (GLB), `FBXLoader` (furniture)
- Controls: `OrbitControls`, `TransformControls`
- Acceleration: `three-mesh-bvh` for BVH-accelerated raycasting

---

## 2. State Management

**None** — vanilla JavaScript variables and closures throughout `main.js`.

Collaborative state is handled by **Liveblocks** (presence sync), not a traditional state manager like Zustand, Redux, or Context.

---

## 3. Backend / Multi-User

Two external services:

| Service | Role | Key Files |
|---|---|---|
| **Liveblocks** | Presence sync (position, rotation, username, speaking state) | `config.js`, `js/collab.js` |
| **Daily.co** | Voice / video calling | `config.js`, `js/voice.js` |

No custom server or database. All state is ephemeral presence — nothing is persisted.

---

## 4. GLB Loading

**Already working.** `GLTFLoader` loads a remote `.glb` from Cloudflare R2 (`baked.glb`).

- Loader setup: `main.js` lines 190–228
- Uses `LoadingManager` for progress tracking (lines 137–159)
- Smart spawn-point detection runs after load via `findStartPosition()`

---

## 5. Raycasting / Click-to-Select

**Fully implemented with BVH acceleration.**

| Purpose | File |
|---|---|
| Floor detection (downward ray) | `js/controls/FirstPersonControls.js` |
| Wall collision (horizontal ray) | `js/controls/FirstPersonControls.js` |
| Spawn point grid-scan | `js/utils/findStartPosition.js` |
| Object selection / transform | `modelInteraction.js`, `js/interaction/collisionInteraction.js` |

---

## 6. Project Structure

```
ConvApp/
├── main.js               ← scene setup, render loop, GLB loading
├── config.js             ← API keys (Liveblocks, Daily.co)
├── modelInteraction.js   ← TransformControls for object editing
├── index.html            ← all UI markup + inline styles
├── sw.js                 ← PWA service worker
├── lib/
│   ├── three/            ← Three.js core + loaders/controls/helpers
│   └── three-mesh-bvh/   ← BVH raycasting acceleration
├── js/
│   ├── controls/         ← FirstPersonControls, MobileControls
│   ├── interaction/      ← collisionInteraction, cameraCollision, materialEditor, materialLibrary
│   ├── loaders/          ← furniture, lights, collision boxes
│   ├── menus/            ← MenuManager (editing UI), materialPanel
│   ├── bake/             ← texture baking utility
│   ├── utils/            ← spawner, findStartPosition
│   ├── collab.js         ← Liveblocks presence + peer avatars
│   └── voice.js          ← Daily.co audio
├── styles/
│   ├── menu.css          ← menu/submenu/furniture grid styles
│   └── materialPanel.css ← material editor panel styles
└── assets/, assets2/, images/, models/
```

---

## 7. Key 3D Scene Files

| File | Role |
|---|---|
| `main.js` | Scene, camera, renderer, lighting, GLB load, animation loop |
| `js/controls/FirstPersonControls.js` | First-person movement, floor/wall raycasting |
| `js/collab.js` | Peer presence: colored sphere avatars, name labels, position sync |
| `js/utils/findStartPosition.js` | Grid-raycasts the loaded mesh to find a valid spawn point |
| `modelInteraction.js` | TransformControls for selecting/moving objects |
| `js/menus/menuManager.js` | Editor UI for adding lights, furniture, collision boxes |

---

## 8. Materials

| Material | Usage |
|---|---|
| `MeshStandardMaterial` | Peer avatar spheres (metalness/roughness) |
| `MeshPhongMaterial` | Default for FBX furniture (`js/loaders/furnitureLoader.js`) |
| `MeshBasicMaterial` | Wireframe collision boxes, light helpers |
| `SpriteMaterial` | Canvas-rendered name labels above peer pins (`js/collab.js`) |
| Baked (light-map) | Pre-baked lighting via `js/bake/bakeUtility.js` |

GLB materials can be browsed and replaced at runtime via the Material Editor (see section below).

### Material Editor

A fixed sidebar panel (right side) activated by a toolbar button or C key (cursor mode).

| Capability | Detail |
|---|---|
| Surface selection | Click a mesh to select it; highlighted with emissive tint |
| GLB material browser | "All materials in the model" grid — all unique materials from the loaded GLB, shown as colour swatches |
| Drag-to-apply | Drag any GLB material tile onto the selected surface info area to apply it |
| Custom library | User-created materials stored in IndexedDB (color, opacity, optional texture) |
| Undo | Restores the original material on the selected mesh |
| Export | Downloads the modified scene as `modified_model.glb` via `GLTFExporter` |

Key files: `js/interaction/materialEditor.js`, `js/interaction/materialLibrary.js`, `js/menus/materialPanel.js`, `styles/materialPanel.css`, `lib/three/GLTFExporter.js`

---

## 9. Multi-User Sync

**Liveblocks presence API** — ephemeral, no persistence.

- Camera position + rotation broadcast every ~150 ms via `room.updatePresence()` (`js/collab.js` lines 160–173)
- Peers subscribe via `room.subscribe('others')`
- Speaking state: Daily.co audio event → Liveblocks presence flag
- Peer avatars: colored spheres with canvas-text name labels, updated in real-time

---

## 10. UI Component Library

**Custom vanilla CSS only** — no shadcn, MUI, or Ant Design.

- All markup in `index.html` with a large inline `<style>` block
- Menu/submenu/furniture grid styles in `styles/menu.css`
- Menus are dynamically created DOM elements managed by `js/menus/menuManager.js`