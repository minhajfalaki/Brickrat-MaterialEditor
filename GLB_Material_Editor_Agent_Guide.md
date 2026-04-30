# GLB Material Editor — Implementation Guide

## Context

This is a new feature for an existing vanilla JS + Three.js PWA (ConvApp). Read `PROJECT_OVERVIEW.md` for full project context before starting.

**Goal:** Let users click a surface in the loaded GLB model, pick a replacement material from their personal library, preview it live, and export the modified GLB.

---

## Constraints

- No React, no framework — vanilla JS ES modules matching the existing codebase style.
- No new dependencies via npm — use Three.js (already installed) and browser-native APIs (IndexedDB, File API).
- DOM-based UI following the patterns in `index.html` and `js/menus/menuManager.js`.
- Copy `GLTFExporter.js` from `node_modules/three/examples/jsm/exporters/` into `lib/three/`.
- Do not break existing first-person controls, collaboration, or voice features.
- All new code goes in new files except minimal wiring in `main.js` and `index.html`.

---

## Step 1 — Mode Toggle

Add a "Material Editor" toggle button to the toolbar in `index.html`.

When activated:
- Exit pointer lock.
- Disable `FirstPersonControls`.
- Enable `OrbitControls` (import from existing `lib/three/`) so the user can freely inspect the model.
- Show the material editor panel (Step 4).

When deactivated:
- Hide the panel.
- Disable `OrbitControls`.
- Re-enable `FirstPersonControls`.

Wire the toggle in `main.js` with a boolean flag. Keep it simple — a single function that flips between the two modes.

---

## Step 2 — Surface Selection via Raycasting

Create `js/interaction/materialEditor.js`.

This module should:
- On `enterEditMode()`: attach a `click` event listener to the renderer's canvas.
- On click: cast a ray from the mouse position using `THREE.Raycaster` (you can reuse the BVH setup from `three-mesh-bvh` that the project already uses — check how `FirstPersonControls.js` and `collisionInteraction.js` do it).
- Find the first intersected `Mesh` that has a `.material`.
- Store it as the current selection.
- Highlight it by saving and then tinting `mesh.material.emissive`.
- Unhighlight the previous selection when a new one is picked.
- Call a callback or directly update the panel UI (Step 4) with the selected material's name, color, and whether it has a texture.
- On `exitEditMode()`: remove the click listener, unhighlight any selection, clean up.

**Important:** The converter outputs one mesh primitive per SketchUp material, so selecting a mesh = selecting a material region. This is the intended behavior.

---

## Step 3 — Material Library (IndexedDB)

Create `js/interaction/materialLibrary.js`.

This module manages a persistent local library of user-created materials using the browser's native IndexedDB API (no library needed).

**Material data shape:**
- `id` — string, use `crypto.randomUUID()`
- `name` — string
- `color` — hex string like `#C8A070`
- `opacity` — number 0–1
- `textureBlob` — Blob or null (the actual image file)
- `thumbnailDataURL` — base64 data URL string or null (small preview for the grid)
- `createdAt` — timestamp

**Operations needed:**
- `openDB()` — open/create the database with a `materials` object store keyed on `id`.
- `loadLibrary()` — return all materials.
- `saveMaterial(material)` — insert or update.
- `deleteMaterial(id)` — remove by id.

Keep all functions async, returning Promises. Follow standard IndexedDB patterns — `onupgradeneeded` for schema creation, transactions for reads/writes.

---

## Step 4 — UI Panel

Create `js/menus/materialPanel.js` and `styles/materialPanel.css`.

Build a fixed sidebar panel (right side, ~280px wide) that slides in/out. Follow the style of the existing menus — dark semi-transparent background, light text, matching the look in `styles/menu.css`.

**Panel sections (top to bottom):**

1. **Header** — title "Material Editor" + close button.
2. **Surface info** — shows "Click a surface to select" initially. After selection, shows the material name, a color swatch, and whether it has a texture.
3. **Material library grid** — a CSS grid of square swatches (3 per row). Each swatch shows either the color or a texture thumbnail, with the name below. Clicking a swatch applies that material to the currently selected surface.
4. **Add Material button** — opens a simple form/modal where the user enters a name, picks a color (use a native `<input type="color">`), and optionally uploads a texture image via `<input type="file" accept="image/*">`. On save, generate a thumbnail data URL from the uploaded image (resize to ~128px for the thumbnail), store everything via `materialLibrary.saveMaterial()`, and refresh the grid.
5. **Action buttons:**
   - "Undo" — restores the previous material on the selected mesh (disabled when nothing to undo).
   - "Export GLB" — triggers the export (Step 6).

**Delete materials:** right-click or a small ✕ on each swatch to delete from the library.

Link the CSS file in `index.html`.

---

## Step 5 — Apply Material + Undo

Add these functions to `materialEditor.js`:

**Apply:**
- Take the selected mesh and a `UserMaterial` object from the library.
- Before replacing, store the mesh's current `.material` (cloned) in a Map keyed by the mesh, so you can undo. Only store the first original — don't overwrite if the user applies multiple times.
- Create a new `THREE.MeshStandardMaterial` with the user material's color, opacity, and sidedness (preserve `mesh.material.side` from the original).
- If the user material has a `textureBlob`, create an object URL from the blob, load it with `THREE.TextureLoader`, and assign it as `.map`. Set `colorSpace = THREE.SRGBColorSpace` and `flipY = true`. Revoke the object URL after the texture loads.
- Assign the new material to `mesh.material`.

**Undo:**
- Restore the original material from the Map.
- Remove the entry from the Map.
- Update the panel to reflect the restored material info.

---

## Step 6 — Export Modified GLB

Copy `GLTFExporter.js` from `node_modules/three/examples/jsm/exporters/GLTFExporter.js` into `lib/three/`.

Add an `exportGLB()` function to `materialEditor.js`:
- Use `GLTFExporter.parse()` with `{ binary: true }` to get an ArrayBuffer.
- Create a Blob from the buffer, generate an object URL, and trigger a download via a temporary `<a>` element with `.download = 'modified_model.glb'`.
- Clean up the object URL after download.
- Handle errors with a console log and user-facing alert.

Wire the Export button in the panel to call this function, passing the loaded GLB scene.

---

## Step 7 — Test and Verify

1. Load the app, enter material edit mode, verify orbit controls work and first-person controls are disabled.
2. Click surfaces — confirm highlighting works and surface info updates in the panel.
3. Add 2–3 materials to the library (one color-only, one with a texture). Close and reopen the app — verify they persist.
4. Apply a material — confirm instant live preview.
5. Undo — confirm the original material is restored.
6. Export — download the GLB, reload it in the app (or drop it into https://gltf-viewer.donmccurdy.com/) and confirm the modified materials are present.
7. Exit material edit mode — confirm first-person controls resume normally.
8. Test that collaboration (Liveblocks) and voice (Daily.co) still work in both modes.

---

## File Summary

| Action | File |
|---|---|
| Create | `js/interaction/materialEditor.js` |
| Create | `js/interaction/materialLibrary.js` |
| Create | `js/menus/materialPanel.js` |
| Create | `styles/materialPanel.css` |
| Copy | `lib/three/GLTFExporter.js` (from node_modules) |
| Modify | `main.js` — add mode toggle wiring |
| Modify | `index.html` — add panel HTML, toggle button, CSS link |

---

## Future Enhancements (do not implement now)

- Broadcast material changes to other users via Liveblocks presence.
- Cloud-synced material library (replace IndexedDB with a backend).
- Full PBR material properties (roughness, metallic, normal maps).
- UV repeat/offset controls for tiling textures.
- Material categories, tags, and search.
- Batch apply same material to multiple surfaces.
