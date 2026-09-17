// Robust IndexedDB binary font storage and FontFace registry manager for Fontier
const DB_NAME = 'fontier_font_db';
const DB_VERSION = 1;
const STORE_NAME = 'font_binaries';

let dbPromise: Promise<IDBDatabase> | null = null;

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
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, familyName, buffer, updatedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist font binary to IndexedDB:', err);
  }
}

/**
 * Registers a FontFace object into document.fonts immediately.
 */
export async function registerFontFace(safeFamilyName: string, buffer: ArrayBuffer): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return false;
  try {
    const fontFace = new FontFace(safeFamilyName, buffer);
    await fontFace.load();
    document.fonts.add(fontFace);
    return true;
  } catch (err) {
    console.warn(`Failed to register FontFace for ${safeFamilyName}:`, err);
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
          const fontFace = new FontFace(item.familyName, item.buffer);
          await fontFace.load();
          document.fonts.add(fontFace);
          count++;
        } catch {
          // ignore single font error
        }
      }
    }
    return count;
  } catch (err) {
    console.warn('Rehydration from IndexedDB skipped or failed:', err);
    return 0;
  }
}
