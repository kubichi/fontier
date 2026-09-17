// Robust IndexedDB binary font storage and FontFace registry manager for Fontier
const DB_NAME = 'fontier_font_db';
// Version 2: clears old entries that used ephemeral random UserFont_local_XXXX family names.
// On upgrade, the store is dropped and recreated so stale binaries don't cause ghost registrations.
const DB_VERSION = 2;
const STORE_NAME = 'font_binaries';

let dbPromise: Promise<IDBDatabase> | null = null;
const registeredFamilies = new Set<string>();

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        // Drop old store on version upgrade to clear stale random-family-name entries
        if (event.oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

/**
 * Stores font arrayBuffer binary data into IndexedDB so it persists across reloads.
 */
export async function saveFontBinary(id: string, familyName: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await getDB();
    const cleanBuffer = buffer.slice(0);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, familyName, buffer: cleanBuffer, updatedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist font binary to IndexedDB:', err);
  }
}

/**
 * Registers a FontFace into document.fonts using a blob URL as the font source.
 * Blob URLs are more reliable than raw ArrayBuffer in Electron's Chromium renderer.
 * The @font-face CSS rule is injected first so the CSS engine resolves the family
 * immediately on first paint; the FontFace API is also registered so
 * document.fonts.check() returns the correct result.
 */
export async function registerFontFace(familyName: string, buffer: ArrayBuffer): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const cleanFamily = familyName.replace(/['"]/g, '').trim();
  if (!cleanFamily) return false;

  // Already registered this session — document.fonts persists the face
  if (registeredFamilies.has(cleanFamily)) {
    return true;
  }

  try {
    const cleanBuffer = buffer.slice(0);
    // Blob URL is the most reliable font source in Electron's Chromium renderer
    const blob = new Blob([cleanBuffer], { type: 'font/truetype' });
    const blobUrl = URL.createObjectURL(blob);

    // 1. Inject @font-face style rule FIRST — CSS engine picks it up immediately
    const styleId = 'fontier-font-' + cleanFamily.replace(/[^a-zA-Z0-9]/g, '_');
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = [
        '@font-face {',
        '  font-family: "' + cleanFamily + '";',
        '  src: url("' + blobUrl + '");',
        '  font-weight: 100 900;',
        '  font-style: normal italic;',
        '  font-display: block;',
        '}',
      ].join('\n');
      document.head.appendChild(styleEl);
    }

    // 2. Also register via FontFace API so document.fonts.check() works
    try {
      const face = new FontFace(cleanFamily, 'url("' + blobUrl + '")');
      await face.load();
      document.fonts.add(face);
    } catch (faceErr) {
      // @font-face style injection still provides the fallback — non-fatal
      console.warn('FontFace API load failed for "' + cleanFamily + '" (CSS @font-face still active):', faceErr);
    }

    registeredFamilies.add(cleanFamily);
    return true;
  } catch (err) {
    console.warn('Failed to register font "' + familyName + '":', err);
    return false;
  }
}

/**
 * Re-registers all stored local fonts from IndexedDB on application start.
 * Returns the count of successfully rehydrated fonts.
 */
export async function rehydrateAllStoredFonts(): Promise<number> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    const records: Array<{ id: string; familyName: string; buffer: ArrayBuffer }> = await new Promise(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      }
    );

    let count = 0;
    for (const item of records) {
      if (item.buffer && item.familyName) {
        try {
          const ok = await registerFontFace(item.familyName, item.buffer);
          if (ok) count++;
        } catch (e) {
          console.warn('Rehydration error for font', item.familyName, e);
        }
      }
    }
    return count;
  } catch (err) {
    console.warn('Rehydration from IndexedDB skipped or failed:', err);
    return 0;
  }
}

/**
 * Returns the set of family names registered in this session.
 */
export function getRegisteredFamilies(): ReadonlySet<string> {
  return registeredFamilies;
}
