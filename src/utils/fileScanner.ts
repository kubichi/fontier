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

/**
 * Recursively scans FileSystemDirectoryHandle (File System Access API)
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
            console.warn(`Could not read file ${entry.name}:`, e);
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
 * Recursively scans a WebKit FileSystemEntry (drag-and-drop folders)
 */
async function scanEntryRecursively(entry: any, files: File[]): Promise<void> {
  if (!entry) return;

  if (entry.isFile) {
    if (isFontFileName(entry.name)) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            files.push(file);
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
        await scanEntryRecursively(child, files);
      }
    } catch (err) {
      console.warn('Error reading directory entries:', err);
    }
  }
}

/**
 * Extracts all font files from DataTransfer (drag and drop supporting both raw files and nested folders)
 */
export async function scanDroppedItems(dataTransfer: DataTransfer): Promise<{ files: File[]; folderName: string }> {
  const files: File[] = [];
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
          await scanEntryRecursively(entry, files);
        } else {
          const file = item.getAsFile();
          if (file && isFontFileName(file.name)) {
            files.push(file);
          }
        }
      }
    }
  } else if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const f = dataTransfer.files[i];
      if (isFontFileName(f.name)) {
        files.push(f);
      }
    }
  }

  return { files, folderName: detectedFolderName };
}
