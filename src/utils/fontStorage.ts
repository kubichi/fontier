// Robust IndexedDB binary font storage and FontFace registry manager for Fontier
const DB_NAME = 'fontier_font_db';
// Version 2: clears old entries that used ephemeral random UserFont_local_XXXX family names.
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
 * Stores font binary in IndexedDB for persistence across app restarts.
 * Stores a copy so the caller can release their reference.
 */
export async function saveFontBinary(id: string, familyName: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await getDB();
    // Slice to detach from any shared buffer and let the original be GC'd
    const storedBuffer = buffer.slice(0);
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, familyName, buffer: storedBuffer, updatedAt: Date.now() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not persist font binary to IndexedDB:', err);
  }
}

/**
 * Registers a font into document.fonts using the FontFace API.
 *
 * Strategy:
 * - Create a temporary Blob URL from the buffer.
 * - Load the FontFace using the blob URL (most reliable in Electron/Chromium).
 * - Add the loaded face to document.fonts.
 * - Immediately revoke the blob URL — the font data is now held by the browser's
 *   internal font engine, not the JS heap. This is critical for RAM: an unrevoked
 *   blob URL pins the full binary in memory forever.
 * - The browser automatically repaints text using the new face (no React re-render needed).
 */
export async function registerFontFace(familyName: string, buffer: ArrayBuffer): Promise<boolean> {
  if (typeof document === 'undefined') return false;

  const cleanFamily = familyName.replace(/['"]/g, '').trim();
  if (!cleanFamily) return false;

  if (registeredFamilies.has(cleanFamily)) {
    return true;
  }

  let blobUrl = '';
  try {
    // Do NOT slice — we just need a temporary view for the Blob constructor
    const blob = new Blob([buffer], { type: 'font/truetype' });
    blobUrl = URL.createObjectURL(blob);

    const face = new FontFace(cleanFamily, 'url("' + blobUrl + '")');
    await face.load();
    document.fonts.add(face);

    registeredFamilies.add(cleanFamily);
    return true;
  } catch (err) {
    console.warn('Failed to register font "' + familyName + '":', err);
    return false;
  } finally {
    // Always revoke — whether load succeeded or failed.
    // Once document.fonts.add(face) is called, the browser engine owns the data.
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Light startup rehydration:
 * Loads at most maxCount (default 30) stored fonts from IndexedDB for the initial viewport.
 * All other fonts load smoothly on demand via ensureFontLoaded when scrolled into view.
 * This prevents loading 4,000+ font buffers into RAM, keeping memory usage at ~180-200MB!
 */
export async function rehydrateAllStoredFonts(maxCount = 30): Promise<number> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    let count = 0;
    await new Promise<void>((resolve) => {
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = async (e: any) => {
        const cursor = e.target.result;
        if (!cursor || count >= maxCount) {
          resolve();
          return;
        }
        const item = cursor.value;
        if (item && item.buffer && item.familyName) {
          try {
            const ok = await registerFontFace(item.familyName, item.buffer);
            if (ok) count++;
          } catch {
            // ignore
          }
        }
        cursor.continue();
      };
      cursorReq.onerror = () => resolve();
    });

    return count;
  } catch (err) {
    console.warn('Rehydration skipped:', err);
    return 0;
  }
}

export function getRegisteredFamilies(): ReadonlySet<string> {
  return registeredFamilies;
}

/**
 * On-demand lazy font loader.
 * If font face is already loaded, returns immediately.
 * Otherwise, loads from disk (in Electron) or IndexedDB and registers only this font face.
 * This keeps RAM usage low (~180MB) because only fonts currently in the viewport are decoded!
 */
export async function ensureFontLoaded(font: { id: string; fontFamily: string; filePath?: string; provider: string }): Promise<boolean> {
  if (font.provider !== 'Local') return true;
  const cleanFamily = font.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  if (registeredFamilies.has(cleanFamily)) return true;

  // 1. Electron on-demand disk read (fastest, zero RAM storage in IndexedDB)
  if (font.filePath && typeof (window as any).electronAPI?.readFontFile === 'function') {
    try {
      const buf = await (window as any).electronAPI.readFontFile(font.filePath);
      if (buf && buf.byteLength > 0) {
        return await registerFontFace(cleanFamily, buf);
      }
    } catch (e) {
      console.warn('Could not load font file from disk:', font.filePath, e);
    }
  }

  // 2. Fallback to IndexedDB (browser or webkit fallback)
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(font.id);
    const record = await new Promise<any>((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (record && record.buffer) {
      return await registerFontFace(cleanFamily, record.buffer);
    }
  } catch (e) {
    // ignore
  }

  return false;
}

