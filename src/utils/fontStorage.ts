// Robust IndexedDB binary font storage and FontFace registry manager for Fontier
const DB_NAME = 'fontier_font_db';
const DB_VERSION = 1;
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
      request.onupgradeneeded = () => {
        const db = request.result;
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
 * Injects a CSS @font-face style rule as a guaranteed backup alongside FontFace API.
 */
function injectFontFaceStyleRule(familyName: string, blobUrl: string): void {
  if (typeof document === 'undefined') return;
  const styleId = `fontier-font-${familyName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = `
    @font-face {
      font-family: "${familyName}";
      src: url("${blobUrl}") format("truetype"), url("${blobUrl}") format("opentype"), url("${blobUrl}") format("woff2");
      font-weight: 100 900;
      font-style: normal italic;
      font-display: swap;
    }
  `;
}

/**
 * Registers a FontFace object into document.fonts immediately with clean binary buffer and blob fallback.
 */
export async function registerFontFace(safeFamilyName: string, buffer: ArrayBuffer): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  
  // Clean string identifier without quotes
  const cleanFamily = safeFamilyName.replace(/["']/g, '').trim();
  if (registeredFamilies.has(cleanFamily)) {
    return true;
  }

  try {
    const cleanBuffer = buffer.slice(0);
    const blob = new Blob([cleanBuffer], { type: 'font/truetype' });
    const blobUrl = URL.createObjectURL(blob);

    // 1. Try FontFace constructor from ArrayBuffer
    try {
      const fontFace = new FontFace(cleanFamily, cleanBuffer);
      const loadedFace = await fontFace.load();
      if ('fonts' in document) {
        document.fonts.add(loadedFace);
      }
    } catch {
      // 2. Try FontFace constructor from Blob URL
      try {
        const fontFaceUrl = new FontFace(cleanFamily, `url(${blobUrl})`);
        const loadedFaceUrl = await fontFaceUrl.load();
        if ('fonts' in document) {
          document.fonts.add(loadedFaceUrl);
        }
      } catch {
        // Fallback to style tag injection
      }
    }

    // 3. Inject @font-face rule to guarantee CSS engine resolution across all render trees
    injectFontFaceStyleRule(cleanFamily, blobUrl);

    registeredFamilies.add(cleanFamily);
    return true;
  } catch (err) {
    console.warn(`Failed to register FontFace for ${cleanFamily}:`, err);
    return false;
  }
}

/**
 * Re-registers all stored local fonts from IndexedDB on application start.
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
