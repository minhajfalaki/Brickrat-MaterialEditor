import * as THREE from '../../lib/three/three.module.js';
import { GLTFExporter } from '../../lib/three/GLTFExporter.js';

let _canvas = null, _camera = null, _scene = null;
let _selectedMesh = null, _savedEmissive = null;
let _onSelectionChange = null;

const _originals = new Map(); // mesh → cloned original material
const _raycaster = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

function _onClick(e) {
  const rect = _canvas.getBoundingClientRect();
  _mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  _mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_mouse, _camera);

  const meshes = [];
  _scene.traverse(o => { if (o.isMesh) meshes.push(o); });
  const hits = _raycaster.intersectObjects(meshes, false);
  if (!hits.length) return;

  _select(hits[0].object);
}

function _select(mesh) {
  _unhighlight();
  _selectedMesh = mesh;
  _savedEmissive = mesh.material.emissive
    ? mesh.material.emissive.clone()
    : new THREE.Color(0);
  if (mesh.material.emissive) mesh.material.emissive.set(0x334455);

  if (_onSelectionChange) {
    _onSelectionChange({
      name: mesh.material.name || mesh.name || 'Unnamed surface',
      color: mesh.material.color ? '#' + mesh.material.color.getHexString() : null,
      hasTexture: !!mesh.material.map,
    });
  }
}

function _unhighlight() {
  if (_selectedMesh && _savedEmissive && _selectedMesh.material.emissive) {
    _selectedMesh.material.emissive.copy(_savedEmissive);
  }
}

export function enterEditMode(scene, camera, canvas, onSelectionChange) {
  _scene = scene;
  _camera = camera;
  _canvas = canvas;
  _onSelectionChange = onSelectionChange;
  canvas.addEventListener('click', _onClick);
}

export function exitEditMode() {
  if (_canvas) _canvas.removeEventListener('click', _onClick);
  _unhighlight();
  _selectedMesh = null;
  _savedEmissive = null;
  _onSelectionChange = null;
}

export function applyMaterial(userMat) {
  if (!_selectedMesh) return;
  if (!_originals.has(_selectedMesh)) {
    _originals.set(_selectedMesh, _selectedMesh.material.clone());
  }

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(userMat.color),
    opacity: userMat.opacity,
    transparent: userMat.opacity < 1,
    side: _selectedMesh.material.side,
  });

  if (userMat.textureBlob) {
    const url = URL.createObjectURL(userMat.textureBlob);
    new THREE.TextureLoader().load(url, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = true;
      mat.map = tex;
      mat.needsUpdate = true;
      URL.revokeObjectURL(url);
    });
  }

  // Keep the selection highlight on the new material
  mat.emissive = new THREE.Color(0x334455);
  _savedEmissive = new THREE.Color(0);
  _selectedMesh.material = mat;
}

export function undoMaterial() {
  if (!_selectedMesh || !_originals.has(_selectedMesh)) return false;
  const orig = _originals.get(_selectedMesh);
  _originals.delete(_selectedMesh);
  _selectedMesh.material = orig;
  // Re-apply selection highlight so the mesh stays visually selected
  _savedEmissive = orig.emissive ? orig.emissive.clone() : new THREE.Color(0);
  if (orig.emissive) orig.emissive.set(0x334455);

  if (_onSelectionChange) {
    _onSelectionChange({
      name: orig.name || _selectedMesh.name || 'Unnamed surface',
      color: orig.color ? '#' + orig.color.getHexString() : null,
      hasTexture: !!orig.map,
    });
  }
  return true;
}

export function canUndo() {
  return !!(_selectedMesh && _originals.has(_selectedMesh));
}

export function exportGLB() {
  if (!_scene) return;
  const exporter = new GLTFExporter();
  exporter.parse(
    _scene,
    buf => {
      const blob = new Blob([buf], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modified_model.glb';
      a.click();
      URL.revokeObjectURL(url);
    },
    err => {
      console.error('GLTFExporter error:', err);
      alert('Export failed — see console for details.');
    },
    { binary: true }
  );
}
