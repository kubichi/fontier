import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Layers,
  Heart,
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  FolderPlus,
  Plus,
  Clock,
  MoreHorizontal,
  HardDrive,
  Trash2,
  Palette,
} from 'lucide-react';
import { FolderItem } from '../types';

const FOLDER_COLORS = [
  '#888888', // Gray (Default)
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#eab308', // Amber
];

interface SidebarProps {
  currentFilter: string;
  onSelectFilter: (filterId: string) => void;
  folders: FolderItem[];
  onCreateFolder: (name: string, color?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onChangeFolderColor?: (folderId: string, color: string) => void;
  counts: {
    all: number;
    recent: number;
    favorites: number;
    active: number;
    inactive: number;
    byFolder: Record<string, number>;
    google: number;
    local: number;
  };
  onOpenAddModal: () => void;
  onOpenLocalFolder: () => void;
  onOpenSettings?: () => void;
  watchedFolder?: { name: string; count: number };
  onRescanLocalFolder?: () => void;
  theme?: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onSelectFilter,
  folders,
  onCreateFolder,
  onDeleteFolder,
  onChangeFolderColor,
  counts,
  onOpenAddModal,
  onOpenLocalFolder,
  onOpenSettings,
  watchedFolder,
  onRescanLocalFolder,
  theme = 'dark',
}) => {
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [providersOpen, setProvidersOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#888888');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [activeColorPickerFolderId, setActiveColorPickerFolderId] = useState<string | null>(null);

  const isLight = theme === 'light';
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker popup on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setActiveColorPickerFolderId(null);
      }
    }
    if (activeColorPickerFolderId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeColorPickerFolderId]);

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim(), newFolderColor);
      setNewFolderName('');
      setShowFolderInput(false);
    }
  };

  return (
    <aside
      className={`border-r flex select-none shrink-0 h-full transition-all duration-150 ${
        isLight
          ? 'bg-[#ffffff] border-[#e2e8f0] text-[#334155]'
          : 'bg-[#181818] border-[#262626] text-[#c8c8c8]'
      } ${isNavOpen ? 'w-64' : 'w-11'}`}
    >
      {/* Mini leftmost icon rail */}
      <div
        className={`w-11 border-r flex flex-col items-center py-2.5 space-y-3.5 shrink-0 ${
          isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#141414] border-[#222222]'
        }`}
      >
        {/* Hamburger Menu Toggle Button */}
        <button
          onClick={() => setIsNavOpen((prev) => !prev)}
          className={`p-1.5 rounded transition-colors ${
            !isNavOpen
              ? isLight
                ? 'text-[#16a34a] bg-[#dcfce7]'
                : 'text-[#4ade80] bg-[#1e2e22]'
              : isLight
              ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
              : 'text-[#888888] hover:text-white hover:bg-[#202020]'
          }`}
          title={isNavOpen ? 'Collapse navigation panel' : 'Expand navigation panel'}
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Font Library Icon (Clicking reopens panel if closed) */}
        <button
          onClick={() => {
            onSelectFilter('all');
            setIsNavOpen(true);
          }}
          className={`p-1.5 rounded transition-colors ${
            currentFilter === 'all'
              ? isLight
                ? 'text-[#16a34a] bg-[#dcfce7]'
                : 'text-[#4ade80] bg-[#1e2e22]'
              : isLight
              ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
              : 'text-[#888888] hover:text-white hover:bg-[#202020]'
          }`}
          title="Font Library"
        >
          <Layers className="w-4 h-4" />
        </button>

        {/* Favorites Icon: grayish heart icon by default, highlighting appropriately */}
        <button
          onClick={() => {
            onSelectFilter('favorites');
            setIsNavOpen(true);
          }}
          className={`p-1.5 rounded transition-colors ${
            currentFilter === 'favorites'
              ? isLight
                ? 'text-[#ef4444] bg-[#fee2e2]'
                : 'text-[#ef4444] bg-[#351818]'
              : isLight
              ? 'text-[#888888] hover:text-[#ef4444] hover:bg-[#e2e8f0]'
              : 'text-[#888888] hover:text-[#ef4444] hover:bg-[#202020]'
          }`}
          title="Favorites"
        >
          <Heart className="w-4 h-4" />
        </button>

        {/* Folders Icon (grayish like before) */}
        <button
          onClick={() => {
            setFoldersOpen(true);
            setIsNavOpen(true);
          }}
          className={`p-1.5 rounded transition-colors ${
            currentFilter.startsWith('folder-')
              ? isLight
                ? 'text-[#0f172a] bg-[#e2e8f0]'
                : 'text-white bg-[#2b2b2b]'
              : isLight
              ? 'text-[#888888] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
              : 'text-[#888888] hover:text-white hover:bg-[#202020]'
          }`}
          title="Folders"
        >
          <FolderIcon className="w-4 h-4" />
        </button>

        <div className="flex-1" />

        {/* 3 Round Dots Icon (Settings & Preferences Option) */}
        <button
          onClick={onOpenSettings}
          className={`p-1.5 rounded transition-colors ${
            isLight
              ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
              : 'text-[#888888] hover:text-white hover:bg-[#242424]'
          }`}
          title="Settings & Preferences"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Main navigation list (Only rendered/visible when panel is open) */}
      {isNavOpen && (
        <div className="flex-1 flex flex-col justify-between overflow-hidden">
          <div className="overflow-y-auto px-2 py-3 space-y-4 flex-1 text-xs">
            {/* Primary font filters */}
            <div className="space-y-0.5">
              <button
                id="filter-all"
                onClick={() => onSelectFilter('all')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                  currentFilter === 'all'
                    ? isLight
                      ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                      : 'bg-[#2b2b2b] text-white font-medium'
                    : isLight
                    ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                    : 'text-[#bbbbbb] hover:bg-[#222222] hover:text-white'
                }`}
              >
                <span className="truncate">All</span>
                <span
                  className={`text-[11px] tabular-nums font-mono ${
                    isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                  }`}
                >
                  {counts.all}
                </span>
              </button>

              <button
                id="filter-recent"
                onClick={() => onSelectFilter('recent')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                  currentFilter === 'recent'
                    ? isLight
                      ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                      : 'bg-[#2b2b2b] text-white font-medium'
                    : isLight
                    ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                    : 'text-[#bbbbbb] hover:bg-[#222222] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Clock className="w-3.5 h-3.5 text-[#888888]" />
                  <span className="truncate">Recent</span>
                </div>
                <span
                  className={`text-[11px] tabular-nums font-mono ${
                    isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                  }`}
                >
                  {counts.recent}
                </span>
              </button>

              {/* Favorites row: clean grayish heart icon */}
              <button
                id="filter-favorites"
                onClick={() => onSelectFilter('favorites')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                  currentFilter === 'favorites'
                    ? isLight
                      ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                      : 'bg-[#2b2b2b] text-white font-medium'
                    : isLight
                    ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                    : 'text-[#bbbbbb] hover:bg-[#222222] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Heart className="w-3.5 h-3.5 text-[#888888]" />
                  <span className="truncate">Favorites</span>
                </div>
                <span
                  className={`text-[11px] tabular-nums font-mono ${
                    isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                  }`}
                >
                  {counts.favorites}
                </span>
              </button>

              {/* Active row */}
              <button
                id="filter-active"
                onClick={() => onSelectFilter('active')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                  currentFilter === 'active'
                    ? isLight
                      ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                      : 'bg-[#2b2b2b] text-white font-medium'
                    : isLight
                    ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                    : 'text-[#bbbbbb] hover:bg-[#222222] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
                  <span className="truncate">Active</span>
                </div>
                <span
                  className={`text-[11px] tabular-nums font-mono ${
                    isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                  }`}
                >
                  {counts.active}
                </span>
              </button>

              {/* Inactive row */}
              <button
                id="filter-inactive"
                onClick={() => onSelectFilter('inactive')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors ${
                  currentFilter === 'inactive'
                    ? isLight
                      ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                      : 'bg-[#2b2b2b] text-white font-medium'
                    : isLight
                    ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                    : 'text-[#bbbbbb] hover:bg-[#222222] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full border border-[#888888]" />
                  <span className="truncate">Inactive</span>
                </div>
                <span
                  className={`text-[11px] tabular-nums font-mono ${
                    isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                  }`}
                >
                  {counts.inactive}
                </span>
              </button>
            </div>

            {/* COLLECTIONS Section */}
            <div className={`pt-2 border-t ${isLight ? 'border-[#e2e8f0]' : 'border-[#242424]'}`}>
              <button
                onClick={() => setCollectionsOpen(!collectionsOpen)}
                className={`w-full flex items-center justify-between py-1 px-1 text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'text-[#64748b] hover:text-[#0f172a]' : 'text-[#888888] hover:text-[#cccccc]'
                }`}
              >
                <span className="flex items-center space-x-1">
                  {collectionsOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Collections</span>
                </span>
              </button>

              {collectionsOpen && (
                <div className="mt-1 space-y-0.5 pl-2">
                  <button
                    onClick={() => onSelectFilter('featured')}
                    className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded text-left transition-colors ${
                      currentFilter === 'featured'
                        ? isLight
                          ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                          : 'bg-[#2b2b2b] text-white font-medium'
                        : isLight
                        ? 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                        : 'text-[#999999] hover:text-white hover:bg-[#222222]'
                    }`}
                  >
                    <span>Featured Typefaces</span>
                  </button>
                </div>
              )}
            </div>

            {/* PROVIDERS Section */}
            <div className={`pt-2 border-t ${isLight ? 'border-[#e2e8f0]' : 'border-[#242424]'}`}>
              <button
                onClick={() => setProvidersOpen(!providersOpen)}
                className={`w-full flex items-center justify-between py-1 px-1 text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'text-[#64748b] hover:text-[#0f172a]' : 'text-[#888888] hover:text-[#cccccc]'
                }`}
              >
                <span className="flex items-center space-x-1">
                  {providersOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Providers</span>
                </span>
              </button>

              {providersOpen && (
                <div className="mt-1 space-y-0.5 pl-2">
                  <button
                    onClick={() => onSelectFilter('provider-google')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                      currentFilter === 'provider-google'
                        ? isLight
                          ? 'bg-[#e2e8f0] text-[#0f172a]'
                          : 'bg-[#2b2b2b] text-white'
                        : isLight
                        ? 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                        : 'text-[#999999] hover:text-white hover:bg-[#222222]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                      <span className="truncate">Google Fonts</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                      }`}
                    >
                      {counts.google}
                    </span>
                  </button>

                  <button
                    onClick={() => onSelectFilter('provider-local')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                      currentFilter === 'provider-local'
                        ? isLight
                          ? 'bg-[#e2e8f0] text-[#0f172a]'
                          : 'bg-[#2b2b2b] text-white'
                        : isLight
                        ? 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                        : 'text-[#999999] hover:text-white hover:bg-[#222222]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <HardDrive className="w-3 h-3 text-[#3b82f6]" />
                      <span className="truncate">Local Fonts</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                      }`}
                    >
                      {counts.local}
                    </span>
                  </button>

                  {watchedFolder && (
                    <div
                      className={`px-2 py-1 rounded mt-1 text-[10px] flex items-center justify-between border ${
                        isLight
                          ? 'bg-[#eff6ff] border-[#bfdbfe] text-[#1d4ed8]'
                          : 'bg-[#1a2333]/40 border-[#25354d]/50 text-[#93c5fd]'
                      }`}
                    >
                      <span className="truncate" title={watchedFolder.name}>
                        {watchedFolder.name}
                      </span>
                      {onRescanLocalFolder && (
                        <button
                          onClick={onRescanLocalFolder}
                          className="text-[#2563eb] hover:underline text-[9px] shrink-0 ml-1"
                        >
                          Rescan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOLDERS Section (default gray folder icons) */}
            <div className={`pt-2 border-t relative ${isLight ? 'border-[#e2e8f0]' : 'border-[#242424]'}`}>
              <div
                className={`flex items-center justify-between py-1 px-1 text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'text-[#64748b]' : 'text-[#888888]'
                }`}
              >
                <button
                  onClick={() => setFoldersOpen(!foldersOpen)}
                  className={`flex items-center space-x-1 ${
                    isLight ? 'hover:text-[#0f172a]' : 'hover:text-[#cccccc]'
                  }`}
                >
                  {foldersOpen ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  <span>Folders</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={onOpenLocalFolder}
                    className={`transition-colors p-0.5 ${
                      isLight
                        ? 'text-[#64748b] hover:text-[#0284c7]'
                        : 'text-[#888888] hover:text-[#38bdf8]'
                    }`}
                    title="Watch local font folder"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setShowFolderInput(true)}
                    className={`transition-colors p-0.5 ${
                      isLight
                        ? 'text-[#64748b] hover:text-[#16a34a]'
                        : 'text-[#888888] hover:text-[#4ade80]'
                    }`}
                    title="Create new folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inline new folder creation form */}
              {showFolderInput && (
                <form onSubmit={handleCreateFolder} className="mt-1.5 px-1 mb-2 space-y-1.5">
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Folder name..."
                      className={`w-full rounded px-2 py-1 text-xs focus:outline-none border ${
                        isLight
                          ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] focus:border-[#16a34a]'
                          : 'bg-[#202020] border-[#404040] text-white focus:border-[#4ade80]'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setShowFolderInput(false);
                      }}
                    />
                  </div>
                  {/* Color selector for new folder */}
                  <div className="flex items-center space-x-1 py-1">
                    <span
                      className={`text-[10px] mr-1 ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}
                    >
                      Color:
                    </span>
                    {FOLDER_COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewFolderColor(c)}
                        className={`w-3.5 h-3.5 rounded-full transition-transform ${
                          newFolderColor === c
                            ? 'scale-125 ring-2 ring-blue-500'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </form>
              )}

              {foldersOpen && (
                <div className="mt-1 space-y-0.5 pl-1">
                  {folders.map((folder) => {
                    const isSelected = currentFilter === `folder-${folder.id}`;
                    const count = counts.byFolder[folder.id] || 0;
                    const folderColor = folder.color || '#888888';

                    return (
                      <div
                        key={folder.id}
                        className={`group w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors cursor-pointer relative ${
                          isSelected
                            ? isLight
                              ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                              : 'bg-[#2b2b2b] text-white font-medium'
                            : isLight
                            ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                            : 'text-[#aaaaaa] hover:bg-[#222222] hover:text-white'
                        }`}
                        onClick={() => onSelectFilter(`folder-${folder.id}`)}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {/* Folder Icon with default gray color */}
                          <FolderIcon
                            className="w-3.5 h-3.5 shrink-0 transition-colors"
                            style={{ color: folderColor }}
                          />
                          <span className="truncate">{folder.name}</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`text-[10px] font-mono tabular-nums ${
                              isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                            }`}
                          >
                            {count}
                          </span>

                          {/* Color picker trigger for folder */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveColorPickerFolderId(
                                activeColorPickerFolderId === folder.id ? null : folder.id
                              );
                            }}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${
                              isLight ? 'text-[#94a3b8] hover:text-[#0f172a]' : 'text-[#777777] hover:text-white'
                            }`}
                            title="Change folder color"
                          >
                            <span
                              className="block w-2.5 h-2.5 rounded-full border border-black/20"
                              style={{ backgroundColor: folderColor }}
                            />
                          </button>

                          {/* Option to delete custom folders */}
                          {!['pixel', 'serif', 'sans', 'display', 'mono', 'script'].includes(
                            folder.id
                          ) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFolder(folder.id);
                              }}
                              className={`opacity-0 group-hover:opacity-100 text-[#ef4444] transition-opacity p-0.5`}
                              title="Delete folder"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Floating Folder Color Picker Dropdown */}
                        {activeColorPickerFolderId === folder.id && (
                          <div
                            ref={colorPickerRef}
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-0 top-8 z-50 p-2 rounded-lg shadow-xl grid grid-cols-5 gap-1.5 w-36 animate-in fade-in zoom-in-95 border ${
                              isLight
                                ? 'bg-[#ffffff] border-[#cbd5e1]'
                                : 'bg-[#1e1e1e] border-[#383838]'
                            }`}
                          >
                            {FOLDER_COLORS.map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => {
                                  onChangeFolderColor?.(folder.id, c);
                                  setActiveColorPickerFolderId(null);
                                }}
                                className={`w-5 h-5 rounded-full border border-black/20 transition-transform ${
                                  folderColor === c
                                    ? 'scale-115 ring-2 ring-blue-500'
                                    : 'hover:scale-110'
                                }`}
                                style={{ backgroundColor: c }}
                                title={`Set folder color: ${c}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom "+ Add" and "Watch Local Folder" buttons */}
          <div
            className={`p-2.5 border-t space-y-1.5 ${
              isLight ? 'border-[#e2e8f0] bg-[#f8fafc]' : 'border-[#262626] bg-[#161616]'
            }`}
          >
            <button
              id="watch-local-folder-btn"
              onClick={onOpenLocalFolder}
              className={`w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 text-xs font-medium rounded border transition-colors ${
                isLight
                  ? 'bg-[#eff6ff] hover:bg-[#dbeafe] text-[#2563eb] border-[#bfdbfe]'
                  : 'bg-[#1e2430] hover:bg-[#252f40] active:bg-[#1a202c] text-[#60a5fa] hover:text-[#93c5fd] border-[#2b3952]'
              }`}
              title="Select and live view a local font folder on your PC"
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Open Local Folder</span>
            </button>

            <button
              id="add-fonts-btn"
              onClick={onOpenAddModal}
              className={`w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 text-xs font-medium rounded border transition-colors ${
                isLight
                  ? 'bg-[#ffffff] hover:bg-[#f1f5f9] text-[#0f172a] border-[#cbd5e1]'
                  : 'bg-[#242424] hover:bg-[#2c2c2c] active:bg-[#1f1f1f] text-[#dddddd] hover:text-white border-[#353535]'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-[#16a34a]" />
              <span>Import Fonts</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};


