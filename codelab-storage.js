const DB_NAME = 'world69-codelab-local';
const DB_VERSION = 2;
const FALLBACK_PREFIX = 'world69-codelab-local:';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento'));
  });
}

async function idbRequest(store, mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    request.onsuccess = () => { db.close(); resolve(request.result); };
    request.onerror = () => { db.close(); reject(request.error); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Operação cancelada')); };
  });
}

function fallbackKey(store, key = 'all') { return `${FALLBACK_PREFIX}${store}:${key}`; }
function fallbackRead(store, key) { try { return JSON.parse(localStorage.getItem(fallbackKey(store, key)) || 'null'); } catch (_) { return null; } }
function fallbackWrite(store, key, value) { try { localStorage.setItem(fallbackKey(store, key), JSON.stringify(value)); return true; } catch (_) { return false; } }

export const CodeLabStorage = {
  async listProjects() {
    try { return await idbRequest('projects', 'readonly', (store) => store.getAll()) || []; }
    catch (_) { return fallbackRead('projects', 'all') || []; }
  },
  async getProject(id) {
    try { return await idbRequest('projects', 'readonly', (store) => store.get(id)); }
    catch (_) { return (fallbackRead('projects', 'all') || []).find((project) => project.id === id) || null; }
  },
  async saveProject(project) {
    const value = { ...project, updatedAt: new Date().toISOString() };
    try { await idbRequest('projects', 'readwrite', (store) => store.put(value)); return true; }
    catch (_) {
      const projects = fallbackRead('projects', 'all') || [];
      const index = projects.findIndex((item) => item.id === value.id);
      if (index >= 0) projects[index] = value; else projects.push(value);
      return fallbackWrite('projects', 'all', projects);
    }
  },
  async deleteProject(id) {
    try { await idbRequest('projects', 'readwrite', (store) => store.delete(id)); return true; }
    catch (_) { return fallbackWrite('projects', 'all', (fallbackRead('projects', 'all') || []).filter((project) => project.id !== id)); }
  },
  async getMeta(key, fallback = null) {
    try { return (await idbRequest('meta', 'readonly', (store) => store.get(key))) ?? fallback; }
    catch (_) { return fallbackRead('meta', key) ?? fallback; }
  },
  async saveMeta(key, value) {
    try { await idbRequest('meta', 'readwrite', (store) => store.put(value, key)); return true; }
    catch (_) { return fallbackWrite('meta', key, value); }
  },
  async clear() {
    try {
      const db = await openDb();
      await Promise.all(['projects', 'meta'].map((name) => new Promise((resolve, reject) => {
        const tx = db.transaction(name, 'readwrite');
        tx.objectStore(name).clear(); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
      })));
      db.close();
    } catch (_) { Object.keys(localStorage).filter((key) => key.startsWith(FALLBACK_PREFIX)).forEach((key) => localStorage.removeItem(key)); }
  },
  async exportData() {
    return { version: 1, exportedAt: new Date().toISOString(), projects: await this.listProjects(), settings: await this.getMeta('settings', {}), history: await this.getMeta('history', []) };
  },
  async importData(data) {
    if (!data || !Array.isArray(data.projects)) throw new Error('Ficheiro de dados inválido');
    for (const project of data.projects.slice(0, 100)) {
      if (!project.id || !project.files || typeof project.files !== 'object') continue;
      await this.saveProject(project);
    }
    if (data.settings) await this.saveMeta('settings', data.settings);
    if (Array.isArray(data.history)) await this.saveMeta('history', data.history.slice(-50));
  }
};

export function makeProject(name = 'Meu primeiro projeto', files = null) {
  const now = new Date().toISOString();
  return {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
    updatedAt: now,
    files: files || {
      'index.html': '<!doctype html>\n<html lang="pt">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width,initial-scale=1">\n  <title>Meu projeto</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <main class="app">\n    <h1>Olá, CodeLab!</h1>\n    <p>Edita os ficheiros e carrega em Executar.</p>\n    <button id="hello">Clica aqui</button>\n  </main>\n  <script src="script.js"><\/script>\n</body>\n</html>',
      'style.css': 'body { margin: 0; font: 16px system-ui; background: #10151b; color: #eff8f0; }\n.app { max-width: 680px; margin: 12vh auto; padding: 32px; }\nbutton { padding: 10px 15px; cursor: pointer; }',
      'script.js': 'document.querySelector("#hello").addEventListener("click", () => {\n  console.log("Button clicked");\n});\nconsole.log("Preview ready");'
    },
    activeFile: 'index.html',
    progress: 0,
    history: []
  };
}
