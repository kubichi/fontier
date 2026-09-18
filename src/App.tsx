import React, { useState, useMemo, useEffect, useRef, useDeferredValue } from 'react';
import { TitleBar } from './components/TitleBar';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { FontRow } from './components/FontRow';
import { FontDetailPage } from './components/FontDetailPage';
import { FontPropertiesPanel } from './components/FontPropertiesPanel';
import { BottomPreviewBar } from './components/BottomPreviewBar';
import { AddFontModal } from './components/AddFontModal';
import { SettingsModal } from './components/SettingsModal';
import { FontItem, FolderItem, TextAlignment, ViewMode, FontFilters, AppSettings } from './types';
import { INITIAL_FONTS, INITIAL_FOLDERS } from './data/defaultFonts';
import { parseFontFile, parseFontBuffer } from './utils/fontParser';
import { autoTagFontMetadata } from './utils/autoTagger';
import { detectWindowsSystemFonts } from './utils/systemFonts';
import { rehydrateAllStoredFonts } from './utils/fontStorage';
import { scanDroppedItems, scanDirectoryHandle, scanDirectoryHandleWithPaths, ScannedFontFile } from './utils/fileScanner';

import { Folder, Search, Plus, HardDrive, RefreshCw, X, Check } from 'lucide-react';

const DEFAULT_FILTERS: FontFilters = {
  category: 'All',
  format: 'all',
  status: 'all',
  provider: 'all',
};

const DEFAULT_SETTINGS: AppSettings = {
  appTheme: 'dark',
  defaultFontSize: 42,
  autoActivateOnImport: true,
  rowDensity: 'comfortable',
  uiFont: 'Geist',
};

export default function App() {
  // Load fonts from localStorage or fallback to default
  const [fonts, setFonts] = useState<FontItem[]>(() => {
    try {
      const saved = localStorage.getItem('fontbase_fonts');
      if (saved) {
        const parsed: FontItem[] = JSON.parse(saved);
        return parsed
          // Migration: filter out hidden AppleDouble dot files (._*) and obsolete family names
          .filter((f) => {
            if (f.name && (f.name.startsWith('._') || f.name.startsWith('.'))) {
              return false;
            }
            if (f.fileName && (f.fileName.startsWith('._') || f.fileName.startsWith('.'))) {
              return false;
            }
            if (f.provider === 'Local' && f.fontFamily && f.fontFamily.includes('UserFont_local_')) {
              return false;
            }
            return true;
          })
          .map((f) => {
            if (!f.tags || f.tags.length === 0) {
              const auto = autoTagFontMetadata({
                fontName: f.name,
                postScriptName: f.postScriptName,
                fileName: f.fileName,
                subfamily: f.styles?.[0]?.name,
              });
              return { ...f, tags: auto.tags };
            }
            return f;
          });
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_FONTS.map((f) => {
      const auto = autoTagFontMetadata({
        fontName: f.name,
        postScriptName: f.postScriptName,
        fileName: f.fileName,
        subfamily: f.styles?.[0]?.name,
      });
      return { ...f, tags: auto.tags };
    });
  });


  // Load folders from localStorage or fallback to default
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    try {
      const saved = localStorage.getItem('fontbase_folders');
      if (saved) {
        const parsed: FolderItem[] = JSON.parse(saved);
        return parsed.filter((f) => !f.name.startsWith('.') && f.name !== '__MACOSX');
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_FOLDERS;
  });

  // State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('fontbase_app_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  const currentTheme: 'dark' | 'light' = appSettings.appTheme === 'light' ? 'light' : 'dark';
  const isLight = currentTheme === 'light';
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filters, setFilters] = useState<FontFilters>(DEFAULT_FILTERS);
  const [alignment, setAlignment] = useState<TextAlignment>('left');
  const [fontSize, setFontSize] = useState<number>(() => appSettings.defaultFontSize || 42);
  const [textColor, setTextColor] = useState<string>('#111111');
  const [bgColor, setBgColor] = useState<string>('#ffffff');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [previewText, setPreviewText] = useState<string>(
    'The quick brown fox jumps over the lazy dog.'
  );
  const [detailFont, setDetailFont] = useState<FontItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  // Dedicated Font Properties Inspector Panel
  const [selectedFontForInspector, setSelectedFontForInspector] = useState<FontItem | null>(() => {
    return fonts[0] || null;
  });
  const [showInspector, setShowInspector] = useState<boolean>(true);

  // Local Folder Watching state
  const [watchedFolder, setWatchedFolder] = useState<{
    name: string;
    folderId: string;
    count: number;
    dirHandle?: any;
  } | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState<boolean>(false);

  const folderInputRef = useRef<HTMLInputElement>(null);
  const folderHandlesRef = useRef<Map<string, any>>(new Map());

  // Performance: True viewport windowing / virtualization so only ~20-30 font rows are mounted in the DOM
  const fontListContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(800);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const deferredPreviewText = useDeferredValue(previewText);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [systemFontProgress, setSystemFontProgress] = useState<{ loaded: number; total: number } | null>(null);

  // Sync accent color (custom user preference or native system accent) into CSS custom property
  useEffect(() => {
    const applyAccent = (color: string) => {
      if (color && typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--accent-color', color);
      }
    };
    if (appSettings.customAccentColor) {
      applyAccent(appSettings.customAccentColor);
      return;
    }
    if (typeof window !== 'undefined' && window.electronAPI?.getAccentColor) {
      window.electronAPI
        .getAccentColor()
        .then((color) => {
          if (color && color.startsWith('#')) {
            applyAccent(color);
          } else {
            applyAccent('#38bdf8');
          }
        })
        .catch(() => {
          applyAccent('#38bdf8');
        });
    } else {
      applyAccent('#38bdf8');
    }
  }, [appSettings.customAccentColor]);

  // Auto-detect Windows system fonts progressively without locking UI
  useEffect(() => {
    let isCancelled = false;
    detectWindowsSystemFonts((loaded, total) => {
      if (!isCancelled) {
        setSystemFontProgress({ loaded, total });
      }
    }).then((sysFonts) => {
      if (isCancelled) return;
      setSystemFontProgress(null);
      if (sysFonts.length === 0) return;

      // Load stored overrides for active/favorite states if any
      let overrides: Record<string, { active?: boolean; favorite?: boolean; folderId?: string }> = {};
      try {
        const raw = localStorage.getItem('fontbase_font_overrides');
        if (raw) overrides = JSON.parse(raw);
      } catch {
        // ignore
      }

      const appliedSysFonts = sysFonts.map((f) => {
        const o = overrides[f.id];
        if (o) {
          return {
            ...f,
            active: o.active !== undefined ? o.active : f.active,
            favorite: o.favorite !== undefined ? o.favorite : f.favorite,
            folderId: o.folderId || f.folderId,
          };
        }
        return f;
      });

      setFonts((prev) => {
        const existingNames = new Set(prev.map((f) => f.name.toLowerCase()));
        const uniqueSys = appliedSysFonts.filter((f) => !existingNames.has(f.name.toLowerCase()));
        if (uniqueSys.length === 0) return prev;
        return [...prev, ...uniqueSys];
      });
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  // fontRenderKey is bumped after IndexedDB rehydration completes so React re-renders
  // font previews that were initially painted before font faces were registered.
  const [fontRenderKey, setFontRenderKey] = useState<number>(0);

  // Rehydrate stored font binaries into document.fonts and inject styles on startup.
  // After rehydration, bump fontRenderKey to trigger a re-render of all font rows —
  // this fixes the bug where fonts rendered before their faces were loaded showed as sans-serif.
  useEffect(() => {
    rehydrateAllStoredFonts()
      .then((count) => {
        if (count > 0) {
          // Force a re-render so font rows pick up the newly registered faces
          setFontRenderKey((k) => k + 1);
        }
      })
      .catch((err) => {
        console.warn('Could not rehydrate stored font binaries:', err);
      });
  }, []);


  // Measure scroll container size for dynamic viewport virtualization (with jitter thresholds to eliminate CPU/GPU loops)
  useEffect(() => {
    const el = fontListContainerRef.current;
    if (!el) return;
    let rafId: number | null = null;

    const updateDimensions = () => {
      if (!el) return;
      const h = el.clientHeight || 800;
      const w = el.clientWidth || 1200;
      // Guard against subpixel or scrollbar jitter triggering re-render cascades
      setContainerHeight((prev) => (Math.abs(prev - h) >= 4 ? h : prev));
      setContainerWidth((prev) => (Math.abs(prev - w) >= 8 ? w : prev));
    };

    updateDimensions();

    const ro = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateDimensions);
    });

    ro.observe(el);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [detailFont]);

  // Reset scroll position when navigation or filter changes
  useEffect(() => {
    setScrollTop(0);
    if (fontListContainerRef.current) {
      fontListContainerRef.current.scrollTop = 0;
    }
  }, [currentFilter, filters, deferredSearchQuery]);

  // Auto-Navigate Back from Detail Page on Search
  useEffect(() => {
    if (searchQuery.trim() && detailFont) {
      setDetailFont(null);
    }
  }, [searchQuery]);

  // RAF-throttled scroll handler with delta guard — eliminates browser clamping feedback loops at the bottom of 4k fonts
  const scrollRafRef = useRef<number | null>(null);
  const handleFontListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScroll = e.currentTarget.scrollTop;
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      setScrollTop((prev) => (Math.abs(prev - newScroll) < 2 ? prev : newScroll));
      scrollRafRef.current = null;
    });
  };

  // Persist custom fonts & overrides safely without quota overflow or lag (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        // Only persist non-system fonts to prevent huge stringify latency with 8k fonts
        const customOnly = fonts.filter((f) => f.provider !== 'System');
        localStorage.setItem('fontbase_fonts', JSON.stringify(customOnly));

        // Save overrides (active/favorite/folder) for system fonts in a tiny compact dictionary
        const overrides: Record<string, { active?: boolean; favorite?: boolean; folderId?: string }> = {};
        for (const f of fonts) {
          if (f.provider === 'System' && (!f.active || f.favorite || f.folderId)) {
            overrides[f.id] = {
              active: f.active,
              favorite: f.favorite,
              folderId: f.folderId,
            };
          }
        }
        localStorage.setItem('fontbase_font_overrides', JSON.stringify(overrides));
      } catch (e) {
        console.warn('Storage quota notice:', e);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [fonts]);

  // Persist folders
  useEffect(() => {
    try {
      localStorage.setItem('fontbase_folders', JSON.stringify(folders));
    } catch (e) {
      console.error(e);
    }
  }, [folders]);

  // If selectedFontForInspector gets removed or becomes stale, update it
  useEffect(() => {
    if (selectedFontForInspector) {
      const updated = fonts.find((f) => f.id === selectedFontForInspector.id);
      if (updated) {
        setSelectedFontForInspector(updated);
      }
    } else if (fonts.length > 0) {
      setSelectedFontForInspector(fonts[0]);
    }
  }, [fonts]);

  // Reset toolbar settings
  const handleResetSettings = () => {
    setFontSize(appSettings.defaultFontSize || 42);
    setAlignment('left');
    setTextColor('#111111');
    setBgColor('#ffffff');
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setAppSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem('fontbase_app_settings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleResetAllData = () => {
    setFonts(INITIAL_FONTS);
    setFolders(INITIAL_FOLDERS);
    setAppSettings(DEFAULT_SETTINGS);
    setFilters(DEFAULT_FILTERS);
    setCurrentFilter('all');
    try {
      localStorage.removeItem('fontbase_fonts');
      localStorage.removeItem('fontbase_folders');
      localStorage.removeItem('fontbase_app_settings');
      localStorage.removeItem('fontbase_custom_presets');
    } catch {
      // ignore
    }
  };

  const handleUpdateFilters = (updates: Partial<FontFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleChangeFolderColor = (folderId: string, color: string) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, color } : f))
    );
  };

  // Toggle active font status
  const handleToggleActive = (id: string) => {
    setFonts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
    if (detailFont && detailFont.id === id) {
      setDetailFont((prev) => (prev ? { ...prev, active: !prev.active } : null));
    }
  };

  // Toggle favorite font
  const handleToggleFavorite = (id: string) => {
    setFonts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, favorite: !f.favorite } : f))
    );
    if (detailFont && detailFont.id === id) {
      setDetailFont((prev) =>
        prev ? { ...prev, favorite: !prev.favorite } : null
      );
    }
  };

  // Update font properties (tags, category, metadata)
  const handleUpdateFont = (id: string, updates: Partial<FontItem>) => {
    setFonts((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
    if (detailFont && detailFont.id === id) {
      setDetailFont((prev) => (prev ? { ...prev, ...updates } : null));
    }
    if (selectedFontForInspector && selectedFontForInspector.id === id) {
      setSelectedFontForInspector((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  // Create new folder
  const handleCreateFolder = (name: string, color?: string, parentId?: string): string => {
    const id = `folder-${Date.now()}`;
    const newFolder: FolderItem = { id, name, color: color || '#eab308', parentId, collapsed: false };
    setFolders((prev) => [...prev, newFolder]);
    return id;
  };

  // Delete folder from App only (leaves PC files completely untouched)
  const handleDeleteFolder = (folderId: string) => {
    const toDelete = new Set<string>();
    const collectDescendants = (pId: string) => {
      toDelete.add(pId);
      folders.filter((f) => f.parentId === pId).forEach((c) => collectDescendants(c.id));
    };
    collectDescendants(folderId);

    setFolders((prev) => prev.filter((f) => !toDelete.has(f.id)));
    setFonts((prev) =>
      prev.filter((f) => !f.folderId || !toDelete.has(f.folderId))
    );
    if (toDelete.has(currentFilter.replace('folder-', ''))) {
      setCurrentFilter('all');
    }
    if (watchedFolder?.folderId && toDelete.has(watchedFolder.folderId)) {
      setWatchedFolder(null);
    }
    setNotification('Removed folder from Fontier. Files on PC remain untouched.');
    setTimeout(() => setNotification(null), 3500);
  };

  // Delete folder from Device / Disk (moves to Windows Recycle Bin)
  const handleDeleteFolderFromDisk = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder?.folderPath && typeof (window as any).electronAPI?.deletePathToTrash === 'function') {
      await (window as any).electronAPI.deletePathToTrash(folder.folderPath);
    }
    handleDeleteFolder(folderId);
    setNotification('Moved folder and files to Recycle Bin.');
    setTimeout(() => setNotification(null), 3500);
  };

  // Bulk delete folders
  const handleBulkDeleteFolders = async (folderIds: string[], deleteFromDisk: boolean) => {
    if (deleteFromDisk) {
      for (const id of folderIds) {
        const folder = folders.find((f) => f.id === id);
        if (folder?.folderPath && typeof (window as any).electronAPI?.deletePathToTrash === 'function') {
          await (window as any).electronAPI.deletePathToTrash(folder.folderPath);
        }
      }
    }

    const toDelete = new Set<string>();
    const collectDescendants = (pId: string) => {
      toDelete.add(pId);
      folders.filter((f) => f.parentId === pId).forEach((c) => collectDescendants(c.id));
    };
    folderIds.forEach((id) => collectDescendants(id));

    setFolders((prev) => prev.filter((f) => !toDelete.has(f.id)));
    setFonts((prev) =>
      prev.filter((f) => !f.folderId || !toDelete.has(f.folderId))
    );
    if (toDelete.has(currentFilter.replace('folder-', ''))) {
      setCurrentFilter('all');
    }

    if (deleteFromDisk) {
      setNotification(`Moved ${folderIds.length} folder(s) to Recycle Bin.`);
    } else {
      setNotification(`Removed ${folderIds.length} folder(s) from Fontier (files on PC untouched).`);
    }
    setTimeout(() => setNotification(null), 3500);
  };


  // Recursive directory scanner supporting nested subfolders of any depth
  const collectFilesRecursively = async (dirHandle: any, files: File[]) => {
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const ext = entry.name.split('.').pop()?.toLowerCase();
        if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
          try {
            const file = await entry.getFile();
            files.push(file);
          } catch (fileErr) {
            console.warn(`Could not read file ${entry.name}:`, fileErr);
          }
        }
      } else if (entry.kind === 'directory') {
        await collectFilesRecursively(entry, files);
      }
    }
  };

  /**
   * Core hierarchical subfolder-aware import.
   * Creates a ROOT parent folder representing the selected folder (e.g. "fonts").
   * Any subfolders inside it are nested underneath with parentId: rootFolderId.
   * Streaming file buffers on-demand keeps RAM low!
   */
  const importFontsWithSubfolders = async (
    scannedFiles: ScannedFontFile[],
    rootLabel: string,
    rootFolderPath?: string
  ) => {
    if (scannedFiles.length === 0) return;
    setIsScanning(true);

    try {
      // 1. Group files by subfolder relative path
      const subfolderMap = new Map<string, ScannedFontFile[]>();

      for (const entry of scannedFiles) {
        const fileName = entry.file.name || '';
        if (fileName.startsWith('.') || fileName.startsWith('._')) continue;
        const relPath = entry.relativePath.replace(/\\/g, '/').replace(/^\//, '');
        if (relPath.includes('/.') || relPath.includes('/__MACOSX') || relPath.startsWith('.')) continue;

        const parts = relPath.split('/');
        const subParts = parts.slice(0, -1);
        const subfolderKey = subParts.join('/'); // full subfolder path e.g. "helvetica"
        if (!subfolderMap.has(subfolderKey)) subfolderMap.set(subfolderKey, []);
        subfolderMap.get(subfolderKey)!.push(entry);
      }

      // 2. Create the ROOT folder (e.g. "fonts")
      const rootFolderId = `folder-root-${Date.now()}`;
      const rootFolder: FolderItem = {
        id: rootFolderId,
        name: rootLabel,
        color: '#eab308', // Default yellow folder color
        collapsed: false,
        folderPath: rootFolderPath,
      };

      const newFolders: FolderItem[] = [rootFolder];
      const folderIdByPath = new Map<string, string>();
      folderIdByPath.set('', rootFolderId);

      // Sort keys by depth so parent folders are created before child folders
      const sortedKeys = Array.from(subfolderMap.keys())
        .filter(Boolean)
        .sort((a, b) => a.split('/').length - b.split('/').length);

      for (const key of sortedKeys) {
        const parts = key.split('/');
        let currentPath = '';
        let currentParentId = rootFolderId;

        for (let i = 0; i < parts.length; i++) {
          if (parts[i].startsWith('.') || parts[i] === '__MACOSX') continue;
          currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
          if (!folderIdByPath.has(currentPath)) {
            const subId = `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            newFolders.push({
              id: subId,
              name: parts[i],
              parentId: currentParentId, // NESTED UNDER ITS PARENT!
              color: '#eab308', // Yellow as default for all subfolders!
              folderPath: rootFolderPath ? `${rootFolderPath}/${currentPath}` : undefined,
              collapsed: false,
            });
            folderIdByPath.set(currentPath, subId);
          }
          currentParentId = folderIdByPath.get(currentPath)!;
        }
      }


      // 3. Parse all fonts and assign folderId
      const allParsedFonts: FontItem[] = [];
      const BATCH_SIZE = 25;
      let totalProcessed = 0;

      for (const [key, entries] of subfolderMap.entries()) {
        const targetFolderId = folderIdByPath.get(key) || rootFolderId;
        for (let i = 0; i < entries.length; i += BATCH_SIZE) {
          const batch = entries.slice(i, i + BATCH_SIZE);
          for (const entry of batch) {
            try {
              const buf = await entry.file.arrayBuffer();
              const fullDiskPath = entry.fullPath || (entry.file as any).path;
              // RAM optimization: only first 60 fonts register immediately.
              // All remaining fonts register lazily on-demand when rendered in viewport!
              const item = await parseFontBuffer(
                entry.file.name,
                buf,
                targetFolderId,
                entry.file.size,
                fullDiskPath,
                totalProcessed >= 60
              );
              item.filePath = fullDiskPath || entry.relativePath;
              allParsedFonts.push(item);
            } catch (err) {
              console.warn('Could not parse font ' + entry.file.name + ':', err);
            }
          }
          totalProcessed += batch.length;
          if (scannedFiles.length > 50) {
            setNotification('Reading fonts: ' + Math.min(totalProcessed, scannedFiles.length) + ' / ' + scannedFiles.length + '...');
            await new Promise((r) => setTimeout(r, 0));
          }
        }
      }

      if (allParsedFonts.length > 0) {
        setFolders((prev) => [...prev, ...newFolders]);
        setFonts((prev) => {
          const incomingNames = new Set(allParsedFonts.map((f) => f.name.toLowerCase()));
          const filtered = prev.filter((f) => !(f.provider === 'Local' && incomingNames.has(f.name.toLowerCase())));
          return [...allParsedFonts, ...filtered];
        });
        setCurrentFilter('folder-' + rootFolderId);
        setSelectedFontForInspector(allParsedFonts[0]);
        setShowInspector(true);
        const subfolderCount = newFolders.length - 1;
        setNotification(
          'Imported ' + allParsedFonts.length + ' font' + (allParsedFonts.length === 1 ? '' : 's') +
          ' into "' + rootLabel + '"' +
          (subfolderCount > 0 ? ' (' + subfolderCount + ' subfolders)' : '')
        );
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification('No font files (.ttf, .otf, .woff, .woff2) found in "' + rootLabel + '".');
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error('Error in importFontsWithSubfolders:', err);
      setNotification('Failed to read fonts from directory.');
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsScanning(false);
    }
  };



  // Process a list of File objects into real FontItems using opentype.js
  const processAndImportFontFiles = async (
    files: File[],
    folderLabel: string,
    dirHandle?: any,
    targetFolderIdParam?: string
  ) => {
    setIsScanning(true);
    try {
      // Find existing folder or create new in Folders tab
      let targetFolderId = targetFolderIdParam;
      if (!targetFolderId) {
        let folder = folders.find(
          (f) => f.name.toLowerCase() === folderLabel.toLowerCase()
        );
        if (!folder) {
          targetFolderId = `folder-${Date.now()}`;
          const newFolder: FolderItem = {
            id: targetFolderId,
            name: folderLabel,
            color: '#eab308',
          };
          setFolders((prev) => [...prev, newFolder]);
        } else {
          targetFolderId = folder.id;
        }
      }

      if (dirHandle && targetFolderId) {
        folderHandlesRef.current.set(targetFolderId, dirHandle);
      }

      const parsedFonts: FontItem[] = [];
      const BATCH_SIZE = 25;

      // Process in non-blocking batches so 2,000+ fonts don't freeze the app
      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        for (const file of batch) {
          const ext = file.name.split('.').pop()?.toLowerCase();
          if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
            try {
              const fontItem = await parseFontFile(file, targetFolderId);
              parsedFonts.push(fontItem);
            } catch (err) {
              console.warn(`Failed to parse ${file.name}:`, err);
            }
          }
        }

        if (files.length > 50) {
          setNotification(`Reading fonts: ${Math.min(i + BATCH_SIZE, files.length)} / ${files.length}...`);
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (parsedFonts.length > 0) {
        // Merge with existing fonts, replacing duplicates with same name/postScriptName
        setFonts((prev) => {
          const filteredPrev = prev.filter(
            (existing) =>
              !parsedFonts.some(
                (p) =>
                  p.name.toLowerCase() === existing.name.toLowerCase() &&
                  p.provider === 'Local'
              )
          );
          return [...parsedFonts, ...filteredPrev];
        });

        setWatchedFolder({
          name: folderLabel,
          folderId: targetFolderId,
          count: parsedFonts.length,
          dirHandle,
        });

        setCurrentFilter(`folder-${targetFolderId}`);
        setSelectedFontForInspector(parsedFonts[0]);
        setShowInspector(true);
        setNotification(
          `Imported ${parsedFonts.length} font${
            parsedFonts.length === 1 ? '' : 's'
          } into folder "${folderLabel}"`
        );
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification(
          `No font files (.ttf, .otf, .woff, .woff2) detected in "${folderLabel}" or its subfolders`
        );
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error('Error importing font files:', err);
      setNotification('Failed to read fonts from local directory.');
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsScanning(false);
    }
  };

  // Trigger local directory picking (with subfolder recursion)
  const handleOpenLocalFolder = async () => {
    // 1. Electron Native Folder Selection — uses main.cjs select-directory IPC
    if (typeof (window as any).electronAPI?.selectDirectory === 'function') {
      try {
        setIsScanning(true);
        setNotification('Scanning selected folder and all subfolders...');
        const res = await (window as any).electronAPI.selectDirectory();
        if (res && res.files && res.files.length > 0) {
          const rootLabel = res.folderName || 'Local Fonts';
          const rootPath = (res.folderPath || '').replace(/\\/g, '/').replace(/\/$/, '');

          // Convert Electron file list to ScannedFontFile[] with on-demand streaming
          const scanned: ScannedFontFile[] = res.files.map((f: any) => {
            const absPath = (f.path || f.name).replace(/\\/g, '/');
            let relPath = f.relativePath || (
              absPath.startsWith(rootPath)
                ? absPath.slice(rootPath.length).replace(/^\//, '')
                : f.name
            );
            return {
              file: {
                name: f.name,
                size: f.size,
                path: f.path,
                arrayBuffer: async () => {
                  if (typeof (window as any).electronAPI?.readFontFile === 'function') {
                    return await (window as any).electronAPI.readFontFile(f.path);
                  }
                  return new ArrayBuffer(0);
                },
              },
              relativePath: relPath,
              fullPath: f.path,
            };
          });

          await importFontsWithSubfolders(scanned, rootLabel, res.folderPath);
          return;

        }
      } catch (err) {
        console.warn('Electron folder selection error:', err);
      } finally {
        setIsScanning(false);
      }
    }

    // 2. Native File System Directory Picker (showDirectoryPicker) — also path-aware
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          id: 'fontbase-local-fonts',
          mode: 'read',
        });

        setNotification('Scanning "' + dirHandle.name + '" and subfolders...');
        const scanned = await scanDirectoryHandleWithPaths(dirHandle);

        if (scanned.length > 0) {
          await importFontsWithSubfolders(scanned, dirHandle.name);
          return;
        } else {
          setNotification('No .ttf or .otf fonts found in "' + dirHandle.name + '" or its subfolders.');
          setTimeout(() => setNotification(null), 4000);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // User cancelled
        }
        console.warn('showDirectoryPicker fallback to input:', err);
      }
    }

    // 3. Fallback: HTML5 directory input (webkitdirectory)
    folderInputRef.current?.click();
  };



  // Handle files selected via directory input fallback (includes subfolders automatically)
  const handleFolderInputSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const allFiles = Array.from(fileList);
    // Filter only font files across all subfolders
    const fontFiles = allFiles.filter((f) => {
      if (f.name.startsWith('.') || f.name.startsWith('._')) return false;
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ['ttf', 'otf', 'woff', 'woff2'].includes(ext || '');
    });

    let folderName = 'Local Fonts';
    if (allFiles[0].webkitRelativePath) {
      const parts = allFiles[0].webkitRelativePath.split('/');
      if (parts.length > 1) {
        folderName = parts[0];
      }
    }

    if (fontFiles.length > 0) {
      await processAndImportFontFiles(fontFiles, folderName);
    } else {
      setNotification(`No font files found in "${folderName}" or its subfolders.`);
      setTimeout(() => setNotification(null), 4000);
    }
    // Clear input so same directory can be picked again if needed
    e.target.value = '';
  };

  // Rescan specific folder from Folders tab (by folderId)
  const handleRescanFolder = async (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return;
    const dirHandle = folderHandlesRef.current.get(folderId);
    if (dirHandle) {
      setIsScanning(true);
      setNotification(`Rescanning "${folder.name}" and subfolders...`);
      try {
        const files: File[] = [];
        await collectFilesRecursively(dirHandle, files);
        await processAndImportFontFiles(files, folder.name, dirHandle, folderId);
      } catch (err) {
        console.error('Failed to rescan directory handle:', err);
        handleOpenLocalFolder();
      } finally {
        setIsScanning(false);
      }
    } else {
      handleOpenLocalFolder();
    }
  };

  // Reorder folder Up
  const handleMoveFolderUp = (folderId: string) => {
    setFolders((prev) => {
      const idx = prev.findIndex((f) => f.id === folderId);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const item = copy[idx];
      copy[idx] = copy[idx - 1];
      copy[idx - 1] = item;
      return copy;
    });
  };

  // Reorder folder Down
  const handleMoveFolderDown = (folderId: string) => {
    setFolders((prev) => {
      const idx = prev.findIndex((f) => f.id === folderId);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const copy = [...prev];
      const item = copy[idx];
      copy[idx] = copy[idx + 1];
      copy[idx + 1] = item;
      return copy;
    });
  };

  // Rescan local folder
  const handleRescanLocalFolder = async () => {
    if (watchedFolder?.dirHandle) {
      setIsScanning(true);
      try {
        const files: File[] = [];
        await collectFilesRecursively(watchedFolder.dirHandle, files);
        await processAndImportFontFiles(files, watchedFolder.name, watchedFolder.dirHandle, watchedFolder.folderId);
      } catch (err) {
        console.error('Failed to rescan directory:', err);
        handleOpenLocalFolder();
      } finally {
        setIsScanning(false);
      }
    } else {
      handleOpenLocalFolder();
    }
  };

  // Add custom font via modal (single)
  const handleAddCustomFont = (newFont: FontItem) => {
    setFonts((prev) => [newFont, ...prev]);
    setSelectedFontForInspector(newFont);
    setShowInspector(true);
  };

  // Add custom fonts via modal (bulk)
  const handleAddCustomFonts = (newFonts: FontItem[]) => {
    setFonts((prev) => [...newFonts, ...prev]);
    if (newFonts.length > 0) {
      setSelectedFontForInspector(newFonts[0]);
      setShowInspector(true);
      setNotification(`Imported ${newFonts.length} font${newFonts.length === 1 ? '' : 's'}`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Drag and drop handlers on window
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only deactivate if leaving the main window
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsGlobalDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsGlobalDragging(false);
    if (!e.dataTransfer) return;

    try {
      setNotification('Reading dropped folders and font files...');
      const { files: scanned, folderName } = await scanDroppedItems(e.dataTransfer);
      if (scanned.length > 0) {
        await importFontsWithSubfolders(scanned, folderName);
      } else {
        setNotification('No font files (.ttf, .otf, .woff, .woff2) found in dropped items.');
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.warn('Error reading dropped files:', err);
      setIsScanning(false);
    }
  };


  // Compute navigation counts in a single pass (optimized for 8,000+ fonts)
  const counts = useMemo(() => {
    const byFolder: Record<string, number> = {};
    for (const folder of folders) {
      byFolder[folder.id] = 0;
    }

    let favorites = 0;
    let active = 0;
    let inactive = 0;
    let google = 0;
    let local = 0;
    let system = 0;

    for (let i = 0; i < fonts.length; i++) {
      const f = fonts[i];
      if (f.favorite) favorites++;
      if (f.active) active++; else inactive++;

      if (f.provider === 'Google') google++;
      else if (f.provider === 'Local') local++;
      else if (f.provider === 'System') system++;

      if (f.folderId && byFolder[f.folderId] !== undefined) {
        byFolder[f.folderId]++;
      }
    }

    // Recursively aggregate child folder counts into parent folders
    const childrenMap = new Map<string, string[]>();
    for (const f of folders) {
      if (f.parentId) {
        if (!childrenMap.has(f.parentId)) childrenMap.set(f.parentId, []);
        childrenMap.get(f.parentId)!.push(f.id);
      }
    }
    const getDeepCount = (fId: string): number => {
      let total = byFolder[fId] || 0;
      const children = childrenMap.get(fId) || [];
      for (const cId of children) {
        total += getDeepCount(cId);
      }
      return total;
    };
    const aggregatedByFolder: Record<string, number> = {};
    for (const folder of folders) {
      aggregatedByFolder[folder.id] = getDeepCount(folder.id);
    }

    return {
      all: fonts.length,
      recent: Math.min(fonts.length, 8),
      favorites,
      active,
      inactive,
      google,
      local,
      system,
      byFolder: aggregatedByFolder,
    };
  }, [fonts, folders]);

  // Filtered fonts list in a single pass (optimized for 8,000+ fonts, non-blocking)
  const filteredFonts = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const hasSearch = q.length > 0;
    const hasCat = Boolean(filters.category && filters.category !== 'All');
    const targetCat = hasCat ? filters.category.toLowerCase().replace(/[\s-_]/g, '') : '';
    const hasFmt = Boolean(filters.format && filters.format.toLowerCase() !== 'all');
    const targetFmt = hasFmt ? filters.format.toLowerCase() : '';
    const isRecent = currentFilter === 'recent';
    const isFolder = currentFilter.startsWith('folder-');
    const folderId = isFolder ? currentFilter.replace('folder-', '') : '';

    // Collect all descendant folder IDs so selecting parent shows child fonts too!
    const folderFilterIds = new Set<string>();
    if (isFolder) {
      const collectDescendants = (id: string) => {
        folderFilterIds.add(id);
        folders.filter((f) => f.parentId === id).forEach((c) => collectDescendants(c.id));
      };
      collectDescendants(folderId);
    }

    const list: FontItem[] = [];
    const maxRecent = 12;

    for (let i = 0; i < fonts.length; i++) {
      const f = fonts[i];

      // 1. Sidebar navigation filter
      if (isRecent) {
        if (list.length >= maxRecent) break;
      } else if (currentFilter === 'favorites') {
        if (!f.favorite) continue;
      } else if (currentFilter === 'active') {
        if (!f.active) continue;
      } else if (currentFilter === 'inactive') {
        if (f.active) continue;
      } else if (currentFilter === 'featured') {
        if (!f.favorite && !f.active) continue;
      } else if (currentFilter === 'provider-google') {
        if (f.provider !== 'Google') continue;
      } else if (currentFilter === 'provider-local') {
        if (f.provider !== 'Local') continue;
      } else if (currentFilter === 'provider-system') {
        if (f.provider !== 'System') continue;
      } else if (isFolder) {
        if (!f.folderId || !folderFilterIds.has(f.folderId)) continue;
      }


      // 2. Status filter
      if (filters.status === 'active') {
        if (!f.active) continue;
      } else if (filters.status === 'favorites') {
        if (!f.favorite) continue;
      } else if (filters.status === 'inactive') {
        if (f.active) continue;
      }

      // 3. Provider filter
      if (filters.provider === 'google') {
        if (f.provider !== 'Google') continue;
      } else if (filters.provider === 'local') {
        if (f.provider !== 'Local') continue;
      } else if (filters.provider === 'system') {
        if (f.provider !== 'System') continue;
      }

      // 4. Format filter
      if (hasFmt && f.format.toLowerCase() !== targetFmt) {
        continue;
      }

      // 5. Category filter
      if (hasCat) {
        const catMatch =
          (f.category && f.category.toLowerCase().replace(/[\s-_]/g, '') === targetCat) ||
          (f.tags && f.tags.some((t) => t.toLowerCase().replace(/[\s-_]/g, '') === targetCat)) ||
          (targetCat === 'monospace' && f.tags && f.tags.some((t) => t.toLowerCase() === 'mono'));
        if (!catMatch) continue;
      }

      // 6. Search query
      if (hasSearch) {
        const searchMatch =
          f.name.toLowerCase().includes(q) ||
          f.format.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          (f.tags && f.tags.some((t) => t.toLowerCase().includes(q))) ||
          (f.designer && f.designer.toLowerCase().includes(q));
        if (!searchMatch) continue;
      }

      list.push(f);
    }

    return list;
  }, [fonts, currentFilter, filters, deferredSearchQuery]);

  // Current folder name if filtering by folder
  const currentFolderName = useMemo(() => {
    if (currentFilter.startsWith('folder-')) {
      const fId = currentFilter.replace('folder-', '');
      return folders.find((f) => f.id === fId)?.name || 'Folder';
    }
    if (currentFilter === 'favorites') return 'Favorites';
    if (currentFilter === 'active') return 'Active Fonts';
    if (currentFilter === 'inactive') return 'Inactive Fonts';
    if (currentFilter === 'recent') return 'Recent Fonts';
    if (currentFilter === 'provider-google') return 'Google Fonts Library';
    if (currentFilter === 'provider-local') return 'Local Font Files';
    if (currentFilter === 'provider-system') return 'System Fonts';
    if (currentFilter === 'featured') return 'Featured Typefaces';
    return 'All Fonts';
  }, [currentFilter, folders]);

  // Dynamic virtualization for List view: accurately matches DOM row height to prevent spacer mismatch jumps
  const listItemHeight = useMemo(() => {
    const isCompact = appSettings.rowDensity === 'compact';
    return isCompact
      ? Math.max(68, Math.round(fontSize * 1.1) + 42)
      : Math.max(96, Math.round(fontSize * 1.25) + 69);
  }, [appSettings.rowDensity, fontSize]);

  const { listVisibleFonts, listTopSpacer, listBottomSpacer } = useMemo(() => {
    const total = filteredFonts.length;
    if (total === 0) return { listVisibleFonts: [], listTopSpacer: 0, listBottomSpacer: 0 };
    const overscan = 5;
    const visibleCount = Math.ceil(containerHeight / listItemHeight);
    const start = Math.max(0, Math.floor(scrollTop / listItemHeight) - overscan);
    const end = Math.min(total, start + visibleCount + overscan * 2);
    return {
      listVisibleFonts: filteredFonts.slice(start, end),
      listTopSpacer: start * listItemHeight,
      listBottomSpacer: Math.max(0, (total - end) * listItemHeight),
    };
  }, [filteredFonts, scrollTop, containerHeight, listItemHeight]);

  // Dynamic virtualization for Grid view: computes visible range & spacers
  const { gridVisibleFonts, gridTopSpacer, gridBottomSpacer, gridCols } = useMemo(() => {
    const total = filteredFonts.length;
    if (total === 0) return { gridVisibleFonts: [], gridTopSpacer: 0, gridBottomSpacer: 0, gridCols: 6 };

    // Explicitly compute column count and exact card height from containerWidth
    const cardTargetWidth = 145;
    const availableWidth = Math.max(300, containerWidth - 32);
    const cols = Math.max(2, Math.min(10, Math.floor(availableWidth / cardTargetWidth)));

    const gap = 10; // gap-2.5 = 10px
    const cardWidth = Math.floor((availableWidth - (cols - 1) * gap) / cols);
    const cardHeight = cardWidth + gap;
    const totalRows = Math.ceil(total / cols);
    const visibleRows = Math.ceil(containerHeight / Math.max(1, cardHeight));
    const overscanRows = 6;
    const startRow = Math.max(0, Math.floor(scrollTop / Math.max(1, cardHeight)) - overscanRows);
    const endRow = Math.min(totalRows, startRow + visibleRows + overscanRows * 2);

    const startIdx = startRow * cols;
    const endIdx = Math.min(total, endRow * cols);

    return {
      gridVisibleFonts: filteredFonts.slice(startIdx, endIdx),
      gridTopSpacer: startRow * cardHeight,
      gridBottomSpacer: Math.max(0, (totalRows - endRow) * cardHeight),
      gridCols: cols,
    };
  }, [filteredFonts, scrollTop, containerHeight, containerWidth]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden select-none font-sans relative ${
        isLight ? 'bg-[#f1f5f9] text-[#1e293b]' : 'bg-[#191919] text-[#e0e0e0]'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Folder Directory Input Fallback */}
      <input
        type="file"
        ref={folderInputRef}
        // @ts-expect-error webkitdirectory is standard in Chromium / Electron
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFolderInputSelected}
      />

      {/* Global Drag & Drop Overlay */}
      {isGlobalDragging && (
        <div className="absolute inset-0 z-50 bg-[#0b1329]/90 border-2 border-dashed border-accent backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none transition-all">
          <HardDrive className="w-14 h-14 text-accent animate-bounce mb-3" />
          <h2 className="text-xl font-bold text-white mb-1">
            Drop Local Font Files or Folder Here
          </h2>
          <p className="text-sm text-[#94a3b8]">
            Supports .ttf, .otf, .woff, .woff2 • Auto-extracts metadata & glyphs
          </p>
        </div>
      )}

      {/* Live Sync Notification Banner */}
      {notification && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#1e293b] border border-accent-subtle text-[#e2e8f0] px-4 py-2 rounded-lg shadow-xl text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <HardDrive className="w-4 h-4 text-accent" />
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-[#94a3b8] hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* System Font Discovery Banner */}
      {systemFontProgress && !notification && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#0f172a] border border-accent-subtle text-[#e2e8f0] px-4 py-1.5 rounded-full shadow-xl text-xs flex items-center space-x-2.5 animate-in fade-in duration-200">
          <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
          <span>
            Indexing system fonts: <strong>{systemFontProgress.loaded}</strong> / {systemFontProgress.total} ({Math.round((systemFontProgress.loaded / Math.max(1, systemFontProgress.total)) * 100)}%)
          </span>
        </div>
      )}

      {/* 1. Windows 11 & FontBase Title Bar */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onUpdateFilters={handleUpdateFilters}
        onResetFilters={handleResetFilters}
        showControls={appSettings.showTitleBarControls !== false}
        theme={currentTheme}
      />

      {/* Top Loading & Scanning Bar */}
      {(isScanning || systemFontProgress) && (
        <div className="w-full h-0.5 bg-[#252525] overflow-hidden relative z-40 shrink-0">
          {systemFontProgress ? (
            <div
              className="h-full bg-gradient-to-r from-accent via-indigo-400 to-accent transition-all duration-150"
              style={{
                width: `${Math.min(100, Math.round((systemFontProgress.loaded / Math.max(1, systemFontProgress.total)) * 100))}%`,
              }}
            />
          ) : (
            <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent to-transparent loading-bar-indeterminate" />
          )}
        </div>
      )}

      {/* 2. Main content area: Sidebar + Main Stage */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          currentFilter={currentFilter}
          onSelectFilter={(f) => {
            setCurrentFilter(f);
            setDetailFont(null); // return to library view when clicking navigation
          }}
          folders={folders}
          onCreateFolder={handleCreateFolder}
          onDeleteFolder={handleDeleteFolder}
          onDeleteFolderFromDisk={handleDeleteFolderFromDisk}
          onBulkDeleteFolders={handleBulkDeleteFolders}
          onChangeFolderColor={handleChangeFolderColor}

          onMoveFolderUp={handleMoveFolderUp}
          onMoveFolderDown={handleMoveFolderDown}
          onRescanFolder={handleRescanFolder}
          counts={counts}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenLocalFolder={handleOpenLocalFolder}
          onOpenSettings={() => setShowSettingsModal(true)}
          watchedFolder={
            watchedFolder
              ? { name: watchedFolder.name, count: watchedFolder.count }
              : undefined
          }
          onRescanLocalFolder={handleRescanLocalFolder}
          theme={currentTheme}
        />

        {/* Right Section: Toolbar + Font List OR Detail Page */}
        <main
          className={`flex-1 flex flex-col overflow-hidden ${
            isLight ? 'bg-[#ffffff]' : 'bg-[#1c1c1c]'
          }`}
        >
          {detailFont ? (
            /* Dedicated Font Detail Page (matches FontBase Screenshot 2) */
            <FontDetailPage
              font={detailFont}
              onBack={() => setDetailFont(null)}
              previewText={previewText}
              fontSize={fontSize}
              textColor={textColor}
              bgColor={bgColor}
              alignment={alignment}
              onToggleActive={handleToggleActive}
              onToggleFavorite={handleToggleFavorite}
              onUpdateFont={handleUpdateFont}
              theme={currentTheme}
            />
          ) : (
            /* Main Font Viewer & List */
            <>
              {/* Toolbar */}
              <Toolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                alignment={alignment}
                onAlignmentChange={setAlignment}
                fontSize={fontSize}
                onFontSizeChange={setFontSize}
                textColor={textColor}
                onTextColorChange={setTextColor}
                bgColor={bgColor}
                onBgColorChange={setBgColor}
                onResetSettings={handleResetSettings}
                showInspector={showInspector}
                onToggleInspector={() => setShowInspector((prev) => !prev)}
                theme={currentTheme}
              />

              {/* View Header Breadcrumb / Count */}
              <div
                className={`px-4 py-2 border-b flex items-center justify-between text-xs shrink-0 ${
                  isLight
                    ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]'
                    : 'bg-[#171717] border-[#252525] text-[#888888]'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-semibold ${
                      isLight ? 'text-[#0f172a]' : 'text-[#cccccc]'
                    }`}
                  >
                    {currentFolderName}
                  </span>
                  <span>•</span>
                  <span className="tabular-nums">
                    {filteredFonts.length}{' '}
                    {filteredFonts.length === 1 ? 'font' : 'fonts'} found
                  </span>
                  {searchQuery && (
                    <span
                      className="px-1.5 py-0.5 rounded text-[11px] font-medium text-accent bg-accent-subtle"
                    >
                      Searching: &ldquo;{searchQuery}&rdquo;
                    </span>
                  )}
                  {watchedFolder && currentFilter.startsWith('folder-') && (
                    <span
                      className="px-2 py-0.5 rounded text-[11px] flex items-center gap-1 border text-accent bg-accent-subtle border-accent-subtle"
                    >
                      <HardDrive className="w-3 h-3" /> Live Synced
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3">
                  {watchedFolder && (
                    <button
                      onClick={handleRescanLocalFolder}
                      disabled={isScanning}
                      className="text-[11px] text-accent hover:underline flex items-center space-x-1"
                      title="Rescan directory for newly added fonts"
                    >
                      <RefreshCw
                        className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`}
                      />
                      <span>Rescan</span>
                    </button>
                  )}
                  <span className={`text-[11px] ${isLight ? 'text-[#94a3b8]' : 'text-[#666666]'}`}>
                    Click any font row to inspect properties
                  </span>
                </div>
              </div>

              {/* Middle Section: Font Rows List/Grid + Dedicated FontPropertiesPanel */}
              <div className="flex-1 flex overflow-hidden">
                {/* Scrollable Font List / Grid with Virtual Windowing */}
                <div
                  ref={fontListContainerRef}
                  onScroll={handleFontListScroll}
                  className={`flex-1 overflow-y-auto ${
                    isLight ? 'bg-[#ffffff]' : 'bg-[#181818]'
                  }`}
                >
                  {filteredFonts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#888888]">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                          isLight ? 'bg-[#f1f5f9]' : 'bg-[#242424]'
                        }`}
                      >
                        <Search
                          className={`w-6 h-6 ${
                            isLight ? 'text-[#94a3b8]' : 'text-[#666666]'
                          }`}
                        />
                      </div>
                      <p
                        className={`text-sm font-medium mb-1 ${
                          isLight ? 'text-[#0f172a]' : 'text-[#cccccc]'
                        }`}
                      >
                        No fonts found
                      </p>
                      <p
                        className={`text-xs max-w-sm mb-4 ${
                          isLight ? 'text-[#64748b]' : 'text-[#777777]'
                        }`}
                      >
                        {searchQuery
                          ? `No fonts match "${searchQuery}". Try a different keyword.`
                          : 'There are no fonts in this folder or category yet.'}
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleOpenLocalFolder}
                          className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#283852] text-accent text-xs rounded border border-accent-subtle transition-colors flex items-center space-x-1.5"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Open Local Fonts Folder</span>
                        </button>
                        <button
                          onClick={() => setIsAddModalOpen(true)}
                          className={`px-3 py-1.5 text-xs rounded border transition-colors flex items-center space-x-1.5 ${
                            isLight
                              ? 'bg-white hover:bg-[#f1f5f9] text-[#0f172a] border-[#cbd5e1]'
                              : 'bg-[#252525] hover:bg-[#2f2f2f] text-white border-[#383838]'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 text-accent" />
                          <span>Import Font File</span>
                        </button>
                      </div>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="p-4">
                      {gridTopSpacer > 0 && <div style={{ height: `${gridTopSpacer}px` }} />}
                      <div
                        className="grid gap-2.5"
                        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
                      >
                        {gridVisibleFonts.map((font) => (
                          <FontRow
                            key={`${font.id}-${fontRenderKey}`}
                            font={font}
                            previewText={deferredPreviewText}
                            fontSize={fontSize}
                            textColor={textColor}
                            bgColor={bgColor}
                            alignment={alignment}
                            viewMode="grid"
                            isCompact={appSettings.rowDensity === 'compact'}
                            isSelected={selectedFontForInspector?.id === font.id}
                            onSelectFont={(f) => {
                              setSelectedFontForInspector(f);
                              setShowInspector(true);
                            }}
                            onToggleActive={handleToggleActive}
                            onToggleFavorite={handleToggleFavorite}
                            onOpenDetail={setDetailFont}
                            theme={currentTheme}
                          />
                        ))}
                      </div>
                      {gridBottomSpacer > 0 && <div style={{ height: `${gridBottomSpacer}px` }} />}
                    </div>
                  ) : (
                    <div>
                      {listTopSpacer > 0 && <div style={{ height: `${listTopSpacer}px` }} />}
                      <div
                        className={`divide-y ${
                          isLight ? 'divide-[#f1f5f9]' : 'divide-[#222222]'
                        }`}
                      >
                        {listVisibleFonts.map((font) => (
                          <FontRow
                            key={`${font.id}-${fontRenderKey}`}
                            font={font}
                            previewText={deferredPreviewText}
                            fontSize={fontSize}
                            textColor={textColor}
                            bgColor={bgColor}
                            alignment={alignment}
                            viewMode="list"
                            isCompact={appSettings.rowDensity === 'compact'}
                            isSelected={selectedFontForInspector?.id === font.id}
                            onSelectFont={(f) => {
                              setSelectedFontForInspector(f);
                              setShowInspector(true);
                            }}
                            onToggleActive={handleToggleActive}
                            onToggleFavorite={handleToggleFavorite}
                            onOpenDetail={setDetailFont}
                            theme={currentTheme}
                          />
                        ))}
                      </div>
                      {listBottomSpacer > 0 && <div style={{ height: `${listBottomSpacer}px` }} />}
                    </div>
                  )}

                  {/* Virtual Windowing Memory Status */}
                  {filteredFonts.length > 0 && (
                    <div className="py-3 flex items-center justify-center border-t border-[#252525]/30">
                      <span className={`text-[11px] ${isLight ? 'text-slate-400' : 'text-[#666666]'}`}>
                        {filteredFonts.length} {filteredFonts.length === 1 ? 'font' : 'fonts'} loaded • Virtualized memory cache active
                      </span>
                    </div>
                  )}
                </div>

                {/* Dedicated Font Properties Panel (Windows 11 / FontBase style) */}
                {showInspector && selectedFontForInspector && (
                  <FontPropertiesPanel
                    font={selectedFontForInspector}
                    onClose={() => setShowInspector(false)}
                    onOpenDetail={(f: FontItem) => setDetailFont(f)}
                    onToggleActive={handleToggleActive}
                    onToggleFavorite={handleToggleFavorite}
                    onUpdateFont={handleUpdateFont}
                    textColor={textColor}
                    bgColor={bgColor}
                    theme={currentTheme}
                  />
                )}
              </div>
            </>
          )}

          {/* 3. Persistent Bottom Preview Input Bar (FontBase signature) */}
          <BottomPreviewBar
            previewText={previewText}
            onPreviewTextChange={setPreviewText}
            theme={currentTheme}
          />
        </main>
      </div>

      {/* 4. Add Font / Folder Modal */}
      <AddFontModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        folders={folders}
        onAddCustomFont={handleAddCustomFont}
        onAddCustomFonts={handleAddCustomFonts}
        onCreateFolder={handleCreateFolder}
      />

      {/* 5. Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        settings={appSettings}
        onUpdateSettings={handleUpdateSettings}
        onResetAllData={handleResetAllData}
      />
    </div>
  );
}
