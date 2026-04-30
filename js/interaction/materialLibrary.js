const DB_NAME = 'BrickratMaterials';
const DB_VERSION = 1;
const STORE = 'materials';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror  = e => reject(e.target.error);
  });
}

export async function loadLibrary() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  });
}

export async function saveMaterial(material) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(material);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}

export async function deleteMaterial(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  });
}
