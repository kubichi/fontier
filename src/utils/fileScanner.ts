/**
 * Universal Directory and File Scanner for Fontier
 * Handles deep recursive traversal for:
 * 1. Native File System Access API (showDirectoryPicker)
 * 2. Drag-and-drop folders and files (DataTransferItem.webkitGetAsEntry)
 * 3. HTML5 webkitdirectory file inputs
 */

const FONT_EXTENSIONS = new Set(['ttf', 'otf', 'woff', 'woff2', 'ttc']);

export function isFontFileName(fileName: string): boolean {
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? FONT_EXTENSIONS.has(ext) : false;
}

export interface ScannedFontFile {
  file: File | { name: string; size: number; path?: string; arrayBuffer: () => Promise<ArrayBuffer> };
  /** Relative path from the scanned root, e.g. "helvetica/bold/HelveticaBold.ttf" */
  relativePath: string;
  fullPath?: string;
}


/**
 * Recursively scans FileSystemDirectoryHandle (File System Access API).
 * Returns flat File[] for backward-compat callers.
 */
export async function scanDirectoryHandle(
  dirHandle: any,
  files: File[] = [],
  maxDepth = 30
): Promise<File[]> {
  if (maxDepth <= 0) return files;

  try {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        if (isFontFileName(entry.name)) {
          try {
            const file = await entry.getFile();
            files.push(file);
          } catch (e) {
            console.warn('Could not read file ' + entry.name + ':', e);
          }
        }
      } else if (entry.kind === 'directory') {
        await scanDirectoryHandle(entry, files, maxDepth - 1);
      }
    }
  } catch (err) {
    console.warn('Error during directory traversal:', err);
  }

  return files;
}

/**
 * Recursively scans a directory handle and tracks each file's relative path.
 * Used to mirror the on-disk subfolder structure into the app Folders sidebar.
 */
export async function scanDirectoryHandleWithPaths(
  dirHandle: any,
  relBase = '',
  result: ScannedFontFile[] = [],
  maxDepth = 30
): Promise<ScannedFontFile[]> {
  if (maxDepth <= 0) return result;

  try {
    for await (const entry of dirHandle.values()) {
      const entryRelPath = relBase ? relBase + '/' + entry.name : entry.name;
      if (entry.kind === 'file') {
        if (isFontFileName(entry.name)) {
          try {
            const file = await entry.getFile();
            result.push({ file, relativePath: entryRelPath });
          } catch (e) {
            console.warn('Could not read file ' + entry.name + ':', e);
          }
        }
      } else if (entry.kind === 'directory') {
        await scanDirectoryHandleWithPaths(entry, entryRelPath, result, maxDepth - 1);
      }
    }
  } catch (err) {
    console.warn('Error during directory traversal with paths:', err);
  }

  return result;
}

/**
 * Recursively scans a WebKit FileSystemEntry (drag-and-drop) tracking relative paths.
 */
async function scanEntryRecursively(
  entry: any,
  result: ScannedFontFile[],
  relBase = ''
): Promise<void> {
  if (!entry) return;

  const entryRelPath = relBase ? relBase + '/' + entry.name : entry.name;

  if (entry.isFile) {
    if (isFontFileName(entry.name)) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            result.push({ file, relativePath: entryRelPath });
            resolve();
          },
          (err: any) => {
            console.warn('Error reading dropped file:', err);
            resolve();
          }
        );
      });
    }
  } else if (entry.isDirectory) {
    const reader = entry.createReader();
    const readAllEntries = async (): Promise<any[]> => {
      const allEntries: any[] = [];
      const readBatch = (): Promise<any[]> =>
        new Promise((resolve, reject) => {
          reader.readEntries(resolve, reject);
        });

      let batch: any[];
      do {
        batch = await readBatch();
        allEntries.push(...batch);
      } while (batch && batch.length > 0);

      return allEntries;
    };

    try {
      const children = await readAllEntries();
      for (const child of children) {
        await scanEntryRecursively(child, result, entryRelPath);
      }
    } catch (err) {
      console.warn('Error reading directory entries:', err);
    }
  }
}

/**
 * Extracts all font files from DataTransfer (drag-and-drop) with relative path tracking.
 */
export async function scanDroppedItems(
  dataTransfer: DataTransfer
): Promise<{ files: ScannedFontFile[]; folderName: string }> {
  const result: ScannedFontFile[] = [];
  let detectedFolderName = 'Imported Fonts';

  const items = dataTransfer.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const entry = (item as any).webkitGetAsEntry?.();
        if (entry) {
          if (entry.isDirectory && detectedFolderName === 'Imported Fonts') {
            detectedFolderName = entry.name;
          }
          await scanEntryRecursively(entry, result, '');
        } else {
          const file = item.getAsFile();
          if (file && isFontFileName(file.name)) {
            result.push({ file, relativePath: file.name });
          }
        }
      }
    }
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const f = dataTransfer.files[i];
      if (isFontFileName(f.name)) {
        result.push({ file: f, relativePath: f.name });
      }
    }
  }

  return { files: result, folderName: detectedFolderName };
}
