import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { parseFontFile } from './utils/fontParser';
import { autoTagFontMetadata } from './utils/autoTagger';
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
        return parsed.map((f) => {
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
        return JSON.parse(saved);
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

  // Persist fonts
  useEffect(() => {
    try {
      localStorage.setItem('fontbase_fonts', JSON.stringify(fonts));
    } catch (e) {
      console.error(e);
    }
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
  const handleCreateFolder = (name: string, color?: string): string => {
    const id = `folder-${Date.now()}`;
    const newFolder: FolderItem = { id, name, color: color || '#38bdf8' };
    setFolders((prev) => [...prev, newFolder]);
    return id;
  };

  // Delete folder
  const handleDeleteFolder = (folderId: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setFonts((prev) =>
      prev.map((f) => (f.folderId === folderId ? { ...f, folderId: undefined } : f))
    );
    if (currentFilter === `folder-${folderId}`) {
      setCurrentFilter('all');
    }
    if (watchedFolder?.folderId === folderId) {
      setWatchedFolder(null);
    }
  };

  // Process a list of File objects into real FontItems using opentype.js
  const processAndImportFontFiles = async (
    files: File[],
    folderLabel: string,
    dirHandle?: any
  ) => {
    setIsScanning(true);
    try {
      // Find existing folder or create new
      let folder = folders.find(
        (f) => f.name.toLowerCase() === folderLabel.toLowerCase()
      );
      let targetFolderId: string;
      if (!folder) {
        targetFolderId = `folder-${Date.now()}`;
        const newFolder: FolderItem = { id: targetFolderId, name: folderLabel };
        setFolders((prev) => [...prev, newFolder]);
      } else {
        targetFolderId = folder.id;
      }

      const parsedFonts: FontItem[] = [];
      for (const file of files) {
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
          `Live folder connected: ${parsedFonts.length} font${
            parsedFonts.length === 1 ? '' : 's'
          } loaded from "${folderLabel}"`
        );
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification(
          `No font files (.ttf, .otf, .woff, .woff2) detected in "${folderLabel}"`
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

  // Trigger local directory picking
  const handleOpenLocalFolder = async () => {
    // Check if Native File System Directory Picker is available (Electron & modern Chromium)
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        const dirHandle = await (window as any).showDirectoryPicker({
          id: 'fontbase-local-fonts',
          mode: 'read',
        });

        const files: File[] = [];
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
              files.push(file);
            }
          }
        }

        if (files.length > 0) {
          await processAndImportFontFiles(files, dirHandle.name, dirHandle);
          return;
        } else {
          setNotification(`No .ttf or .otf fonts found in "${dirHandle.name}".`);
          setTimeout(() => setNotification(null), 4000);
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return; // User cancelled file picker
        }
        console.warn('showDirectoryPicker fallback to input:', err);
      }
    }

    // Fallback: Trigger standard HTML5 directory input
    folderInputRef.current?.click();
  };

  // Handle files selected via directory input fallback
  const handleFolderInputSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    // Derive directory name from webkitRelativePath
    let folderName = 'Local Fonts';
    if (files[0].webkitRelativePath) {
      const parts = files[0].webkitRelativePath.split('/');
      if (parts.length > 1) {
        folderName = parts[0];
      }
    }

    await processAndImportFontFiles(files, folderName);
    // Clear input so same directory can be picked again if needed
    e.target.value = '';
  };

  // Rescan local folder
  const handleRescanLocalFolder = async () => {
    if (watchedFolder?.dirHandle) {
      setIsScanning(true);
      try {
        const files: File[] = [];
        for await (const entry of watchedFolder.dirHandle.values()) {
          if (entry.kind === 'file') {
            const file = await entry.getFile();
            const ext = file.name.split('.').pop()?.toLowerCase();
            if (['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
              files.push(file);
            }
          }
        }
        await processAndImportFontFiles(files, watchedFolder.name, watchedFolder.dirHandle);
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

  // Add custom font via modal
  const handleAddCustomFont = (newFont: FontItem) => {
    setFonts((prev) => [newFont, ...prev]);
    setSelectedFontForInspector(newFont);
    setShowInspector(true);
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
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

    const files = Array.from(e.dataTransfer.files);
    await processAndImportFontFiles(files, 'Imported Local Fonts');
  };

  // Compute navigation counts
  const counts = useMemo(() => {
    const byFolder: Record<string, number> = {};
    folders.forEach((folder) => {
      byFolder[folder.id] = fonts.filter((f) => f.folderId === folder.id).length;
    });

    return {
      all: fonts.length,
      recent: Math.min(fonts.length, 8),
      favorites: fonts.filter((f) => f.favorite).length,
      active: fonts.filter((f) => f.active).length,
      inactive: fonts.filter((f) => !f.active).length,
      google: fonts.filter((f) => f.provider === 'Google').length,
      local: fonts.filter((f) => f.provider === 'Local').length,
      byFolder,
    };
  }, [fonts, folders]);

  // Filtered fonts list
  const filteredFonts = useMemo(() => {
    let list = [...fonts];

    // Sidebar filter
    if (currentFilter === 'recent') {
      list = list.slice(0, 8);
    } else if (currentFilter === 'favorites') {
      list = list.filter((f) => f.favorite);
    } else if (currentFilter === 'active') {
      list = list.filter((f) => f.active);
    } else if (currentFilter === 'inactive') {
      list = list.filter((f) => !f.active);
    } else if (currentFilter === 'featured') {
      list = list.filter((f) => f.favorite || f.active);
    } else if (currentFilter === 'provider-google') {
      list = list.filter((f) => f.provider === 'Google');
    } else if (currentFilter === 'provider-local') {
      list = list.filter((f) => f.provider === 'Local');
    } else if (currentFilter.startsWith('folder-')) {
      const folderId = currentFilter.replace('folder-', '');
      list = list.filter((f) => f.folderId === folderId);
    }

    // 2. Category filter
    if (filters.category && filters.category !== 'All') {
      const targetCat = filters.category.toLowerCase().replace(/[\s-_]/g, '');
      list = list.filter((f) => {
        if (f.category && f.category.toLowerCase().replace(/[\s-_]/g, '') === targetCat) {
          return true;
        }
        if (f.tags && f.tags.some((t) => t.toLowerCase().replace(/[\s-_]/g, '') === targetCat)) {
          return true;
        }
        if (targetCat === 'monospace' && f.tags && f.tags.some((t) => t.toLowerCase() === 'mono')) {
          return true;
        }
        return false;
      });
    }

    // 3. Format filter
    if (filters.format && filters.format !== 'all') {
      list = list.filter((f) => f.format.toLowerCase() === filters.format.toLowerCase());
    }

    // 4. Status filter
    if (filters.status === 'active') {
      list = list.filter((f) => f.active);
    } else if (filters.status === 'favorites') {
      list = list.filter((f) => f.favorite);
    } else if (filters.status === 'inactive') {
      list = list.filter((f) => !f.active);
    }

    // 5. Provider filter
    if (filters.provider === 'google') {
      list = list.filter((f) => f.provider === 'Google');
    } else if (filters.provider === 'local') {
      list = list.filter((f) => f.provider === 'Local');
    }

    // 6. Search query (matches name, format, category, tags, designer)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.format.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q) ||
          (f.tags && f.tags.some((t) => t.toLowerCase().includes(q))) ||
          (f.designer && f.designer.toLowerCase().includes(q))
      );
    }

    return list;
  }, [fonts, currentFilter, filters, searchQuery]);

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
    if (currentFilter === 'featured') return 'Featured Typefaces';
    return 'All Fonts';
  }, [currentFilter, folders]);

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden select-none font-sans relative transition-colors ${
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
        <div className="absolute inset-0 z-50 bg-[#0b1329]/90 border-2 border-dashed border-[#38bdf8] backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none transition-all">
          <HardDrive className="w-14 h-14 text-[#38bdf8] animate-bounce mb-3" />
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
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-[#1e293b] border border-[#3b82f6] text-[#e2e8f0] px-4 py-2 rounded-lg shadow-xl text-xs flex items-center space-x-2 animate-in fade-in duration-200">
          <HardDrive className="w-4 h-4 text-[#38bdf8]" />
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-[#94a3b8] hover:text-white ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Windows 11 & FontBase Title Bar */}
      <TitleBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onUpdateFilters={handleUpdateFilters}
        onResetFilters={handleResetFilters}
        theme={currentTheme}
      />

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
          onChangeFolderColor={handleChangeFolderColor}
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
          className={`flex-1 flex flex-col overflow-hidden transition-colors ${
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
                className={`px-4 py-2 border-b flex items-center justify-between text-xs shrink-0 transition-colors ${
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
                      className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                        isLight
                          ? 'text-[#16a34a] bg-[#dcfce7]'
                          : 'text-[#4ade80] bg-[#1e2e22]'
                      }`}
                    >
                      Searching: &ldquo;{searchQuery}&rdquo;
                    </span>
                  )}
                  {watchedFolder && currentFilter.startsWith('folder-') && (
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 border ${
                        isLight
                          ? 'text-[#0284c7] bg-[#e0f2fe] border-[#bae6fd]'
                          : 'text-[#60a5fa] bg-[#1e2738] border-[#2b3a52]'
                      }`}
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
                      className="text-[11px] text-[#38bdf8] hover:text-white flex items-center space-x-1"
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
                {/* Scrollable Font List / Grid */}
                <div
                  className={`flex-1 overflow-y-auto transition-colors ${
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
                          className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#283852] text-[#38bdf8] text-xs rounded border border-[#253754] transition-colors flex items-center space-x-1.5"
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
                          <Plus className="w-3.5 h-3.5 text-[#4ade80]" />
                          <span>Import Font File</span>
                        </button>
                      </div>
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredFonts.map((font) => (
                        <FontRow
                          key={font.id}
                          font={font}
                          previewText={previewText}
                          fontSize={fontSize}
                          textColor={textColor}
                          bgColor={bgColor}
                          alignment={alignment}
                          viewMode="grid"
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
                  ) : (
                    <div
                      className={`divide-y ${
                        isLight ? 'divide-[#f1f5f9]' : 'divide-[#222222]'
                      }`}
                    >
                      {filteredFonts.map((font) => (
                        <FontRow
                          key={font.id}
                          font={font}
                          previewText={previewText}
                          fontSize={fontSize}
                          textColor={textColor}
                          bgColor={bgColor}
                          alignment={alignment}
                          viewMode="list"
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
