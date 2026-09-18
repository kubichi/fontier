// Robust IndexedDB binary font storage and FontFace registry manager for Fontier
const DB_NAME = 'fontier_font_db';
// Version 2: clears old entries that used ephemeral random UserFont_local_XXXX family names.
const DB_VERSION = 2;
const STORE_NAME = 'font_binaries';

let dbPromise: Promise<IDBDatabase> | null = null;

class FontLRUCache {
  private cache = new Map<string, FontFace>(); // Map maintains insertion order
  private maxSize: number;
  
  constructor(maxSize: number) { this.maxSize = maxSize; }
  
  has(key: string): boolean { return this.cache.has(key); }
  
  get(key: string): FontFace | undefined {
    const val = this.cache.get(key);
    if (val) { this.cache.delete(key); this.cache.set(key, val); } // promote to MRU
    return val;
  }
  
  set(key: string, value: FontFace): void {
    if (this.cache.has(key)) { this.cache.delete(key); }
    else if (this.cache.size >= this.maxSize) {
      // Evict LRU (first entry)
      const lruKey = this.cache.keys().next().value;
      const lruFace = this.cache.get(lruKey!);
      if (lruFace) { try { document.fonts.delete(lruFace); } catch(e) {} }
      this.cache.delete(lruKey!);
    }
    this.cache.set(key, value);
  }
  
  delete(key: string): void {
    const face = this.cache.get(key);
    if (face) {
      try { document.fonts.delete(face); } catch(e) {}
      this.cache.delete(key);
    }
  }

  get size(): number { return this.cache.size; }

  keys(): IterableIterator<string> { return this.cache.keys(); }
}

// Keep active in-memory font cache balanced (120 fonts max) to keep RAM low without thrashing
const fontCache = new FontLRUCache(120);

export function unregisterFont(font: { fontFamily: string }): void {
  const cleanFamily = font.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  fontCache.delete(cleanFamily);
}

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event: any) => {
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
 * Returns the FontFace object so it can be stored in the cache.
 */
export async function registerFontFace(familyName: string, buffer: ArrayBuffer): Promise<FontFace | null> {
  if (typeof document === 'undefined') return null;

  const cleanFamily = familyName.replace(/['"]/g, '').trim();
  if (!cleanFamily) return null;

  const existing = fontCache.get(cleanFamily);
  if (existing) {
    return existing;
  }

  let blobUrl = '';
  try {
    // Do NOT slice — we just need a temporary view for the Blob constructor
    const blob = new Blob([buffer], { type: 'font/truetype' });
    blobUrl = URL.createObjectURL(blob);

    const face = new FontFace(cleanFamily, 'url("' + blobUrl + '")');
    await face.load();
    document.fonts.add(face);
    
    // Auto-cache it just in case this is called externally (e.g. from fontParser)
    fontCache.set(cleanFamily, face);

    return face;
  } catch (err) {
    console.warn('Failed to register font "' + familyName + '":', err);
    return null;
  } finally {
    // Always revoke — whether load succeeded or failed.
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Light startup rehydration:
 * Loads at most maxCount (default 30) stored fonts from IndexedDB for the initial viewport.
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
            const face = await registerFontFace(item.familyName, item.buffer);
            if (face) {
              // The cache setting is handled inside registerFontFace now, but we can do it explicitly or skip.
              count++;
            }
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
  return new Set(fontCache.keys());
}

export function getRegisteredCount(): number {
  return fontCache.size;
}

const failedFamilies = new Set<string>();
const pendingLoads = new Map<string, Promise<boolean>>();

/**
 * On-demand lazy font loader with duplicate request prevention and failure caching.
 */
export async function ensureFontLoaded(font: { id: string; fontFamily: string; filePath?: string; provider: string }): Promise<boolean> {
  if (font.provider !== 'Local') return true;
  const cleanFamily = font.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
  if (!cleanFamily) return false;
  
  if (fontCache.get(cleanFamily)) {
    return true; // Already loaded and promoted
  }
  if (failedFamilies.has(cleanFamily)) {
    return false; // Skip failed font to avoid hammering disk / IPC
  }
  if (pendingLoads.has(cleanFamily)) {
    return pendingLoads.get(cleanFamily)!;
  }

  const loadPromise = (async (): Promise<boolean> => {
    // 1. Electron on-demand disk read
    if (font.filePath && typeof (window as any).electronAPI?.readFontFile === 'function') {
      try {
        const buf = await (window as any).electronAPI.readFontFile(font.filePath);
        if (buf && buf.byteLength > 0) {
          const face = await registerFontFace(cleanFamily, buf);
          if (face) {
            return true;
          }
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
        const face = await registerFontFace(cleanFamily, record.buffer);
        if (face) {
          return true;
        }
      }
    } catch (e) {
      // ignore
    }

    // Remember failed family to prevent continuous retries
    failedFamilies.add(cleanFamily);
    return false;
  })();

  pendingLoads.set(cleanFamily, loadPromise);
  try {
    return await loadPromise;
  } finally {
    pendingLoads.delete(cleanFamily);
  }
}

/**
 * Retrieves the raw font ArrayBuffer for a local font.
 */
export async function getFontBuffer(font: { id: string; filePath?: string }): Promise<ArrayBuffer | null> {
  // 1. Electron on-demand disk read
  if (font.filePath && typeof (window as any).electronAPI?.readFontFile === 'function') {
    try {
      const buf = await (window as any).electronAPI.readFontFile(font.filePath);
      if (buf && buf.byteLength > 0) return buf;
    } catch (e) {
      console.warn('Could not read font file from disk:', font.filePath, e);
    }
  }

  // 2. IndexedDB lookup
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(font.id);
    const record = await new Promise<any>((resolve) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (record && record.buffer) return record.buffer;
  } catch (e) {
    // ignore
  }

  return null;
}
