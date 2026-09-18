import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Monitor,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { FolderItem } from '../types';

const FOLDER_COLORS = [
  '#eab308', // Yellow (Default folder color)
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#888888', // Gray
];

interface SidebarProps {
  currentFilter: string;
  onSelectFilter: (filterId: string) => void;
  folders: FolderItem[];
  onCreateFolder: (name: string, color?: string, parentId?: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onDeleteFolderFromDisk?: (folderId: string) => void;
  onBulkDeleteFolders?: (folderIds: string[], deleteFromDisk: boolean) => void;
  onChangeFolderColor?: (folderId: string, color: string) => void;
  onMoveFolderUp?: (folderId: string) => void;
  onMoveFolderDown?: (folderId: string) => void;
  onRescanFolder?: (folderId: string) => void;
  counts: {
    all: number;
    recent: number;
    favorites: number;
    active: number;
    inactive: number;
    byFolder: Record<string, number>;
    google: number;
    local: number;
    system?: number;
  };
  onOpenAddModal: () => void;
  onOpenLocalFolder: () => void;
  onOpenSettings?: () => void;
  watchedFolder?: { name: string; count: number; id?: string };
  onRescanLocalFolder?: () => void;
  theme?: 'dark' | 'light';
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFilter,
  onSelectFilter,
  folders,
  onCreateFolder,
  onDeleteFolder,
  onDeleteFolderFromDisk,
  onBulkDeleteFolders,
  onChangeFolderColor,
  onMoveFolderUp,
  onMoveFolderDown,
  onRescanFolder,
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
  const [newFolderColor, setNewFolderColor] = useState('#eab308');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [activeColorPickerFolderId, setActiveColorPickerFolderId] = useState<string | null>(null);

  // Scaler / Resizer state (default 260px, min 180px, max 750px)
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fontier_sidebar_width');
      return saved ? Math.max(180, Math.min(750, parseInt(saved, 10))) : 260;
    } catch {
      return 260;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  // Hierarchical folder collapse state
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<Set<string>>(new Set());

  // Bulk folder selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  // Confirm delete from device modal state
  const [confirmDeviceDelete, setConfirmDeviceDelete] = useState<{ folderIds: string[]; folderNames: string[] } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    folder: FolderItem;
  } | null>(null);

  const isLight = theme === 'light';
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Collect all descendant IDs under a folder
  const getDescendantFolderIds = (folderId: string): string[] => {
    const result: string[] = [];
    const collect = (pId: string) => {
      folders.filter((f) => f.parentId === pId).forEach((c) => {
        result.push(c.id);
        collect(c.id);
      });
    };
    collect(folderId);
    return result;
  };

  // Drag resizer handler (allows dragging from 180px up to 800px smoothly)
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    let currentWidth = startWidth;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const delta = moveEvent.clientX - startX;
      currentWidth = Math.max(180, Math.min(800, startWidth + delta));
      setSidebarWidth(currentWidth);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      upEvent.preventDefault();
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('fontier_sidebar_width', currentWidth.toString());
      } catch {}
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Close color picker and context menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setActiveColorPickerFolderId(null);
      }
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    if (activeColorPickerFolderId || contextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeColorPickerFolderId, contextMenu]);

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
      style={{ width: isNavOpen ? `${sidebarWidth}px` : '44px' }}
      className={`border-r flex select-none shrink-0 h-full relative z-20 ${
        isLight
          ? 'bg-[#ffffff] border-[#e2e8f0] text-[#334155]'
          : 'bg-[#181818] border-[#262626] text-[#c8c8c8]'
      }`}
    >
      {/* Mini leftmost icon rail — ONLY shown when navigation drawer is collapsed */}
      {!isNavOpen && (
        <div
          className={`w-11 border-r flex flex-col items-center py-2.5 space-y-3.5 shrink-0 z-10 ${
            isLight ? 'bg-[#f1f5f9] border-[#e2e8f0]' : 'bg-[#141414] border-[#222222]'
          }`}
        >
          {/* Hamburger Menu Toggle Button */}
          <button
            onClick={() => setIsNavOpen(true)}
            className="p-1.5 rounded transition-colors text-accent bg-accent-subtle"
            title="Expand navigation panel"
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
              ? 'text-accent bg-accent-subtle'
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
      )}

      {/* Main navigation list (Dynamic width with Scaler) */}
      <div
        style={{ width: `${sidebarWidth}px` }}
        className={`shrink-0 flex flex-col justify-between overflow-hidden transition-opacity duration-150 ${
          isNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
          {/* Header row with hamburger menu toggle and preferences button */}
          <div className={`px-3 pt-2.5 pb-1 flex items-center justify-between border-b ${isLight ? 'border-[#e2e8f0]' : 'border-[#222222]'}`}>
            <button
              onClick={() => setIsNavOpen(false)}
              className={`p-1.5 rounded transition-colors ${
                isLight ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]' : 'text-[#888888] hover:text-white hover:bg-[#242424]'
              }`}
              title="Collapse sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className={`p-1.5 rounded transition-colors ${
                isLight ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]' : 'text-[#888888] hover:text-white hover:bg-[#242424]'
              }`}
              title="Settings & Preferences"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          <div
            className="overflow-y-auto no-scrollbar px-2 py-3 space-y-4 flex-1 text-xs"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
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
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                      </svg>
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
                      <HardDrive className="w-3 h-3 text-accent" />
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

                  <button
                    onClick={() => onSelectFilter('provider-system')}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-left transition-colors ${
                      currentFilter === 'provider-system'
                        ? isLight
                          ? 'bg-[#e2e8f0] text-[#0f172a]'
                          : 'bg-[#2b2b2b] text-white'
                        : isLight
                        ? 'text-[#475569] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
                        : 'text-[#999999] hover:text-white hover:bg-[#222222]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Monitor className="w-3 h-3 text-accent" />
                      <span className="truncate">System Fonts</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono ${
                        isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                      }`}
                    >
                      {counts.system ?? 0}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* FOLDERS Section with Hierarchical Subfolder Tree & Bulk Selection */}
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
                  {/* Toggle Bulk Select Mode Button */}
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      if (isSelectionMode) setSelectedFolderIds(new Set());
                    }}
                    className={`transition-colors p-0.5 rounded text-[10px] px-1 font-normal ${
                      isSelectionMode
                        ? 'bg-accent text-white'
                        : isLight
                        ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-slate-200'
                        : 'text-[#888888] hover:text-white hover:bg-neutral-800'
                    }`}
                    title={isSelectionMode ? 'Exit Selection Mode' : 'Bulk Select Folders'}
                  >
                    {isSelectionMode ? 'Done' : 'Select'}
                  </button>

                  <button
                    onClick={onOpenLocalFolder}
                    className="transition-colors p-0.5 text-[#888888] hover:text-accent"
                    title="Open local font folder (with subfolders)"
                  >
                    <HardDrive className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setShowFolderInput(true)}
                    className="transition-colors p-0.5 text-[#888888] hover:text-accent"
                    title="Create new folder"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bulk Selection Action Bar */}
              {isSelectionMode && (
                <div className={`my-1.5 p-2 rounded-md border text-xs space-y-1.5 animate-in fade-in ${
                  isLight ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-[#202020] border-[#383838]'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[11px] text-blue-400">
                      {selectedFolderIds.size} selected
                    </span>
                    <button
                      onClick={() => {
                        const customIds = folders
                          .filter((f) => !['pixel', 'serif', 'sans', 'display', 'mono', 'script'].includes(f.id))
                          .map((f) => f.id);
                        if (selectedFolderIds.size === customIds.length) {
                          setSelectedFolderIds(new Set());
                        } else {
                          setSelectedFolderIds(new Set(customIds));
                        }
                      }}
                      className="text-[11px] underline hover:text-white text-neutral-400"
                    >
                      {selectedFolderIds.size > 0 ? 'Clear All' : 'Select All'}
                    </button>
                  </div>

                  {selectedFolderIds.size > 0 && (
                    <div className="grid grid-cols-2 gap-1 pt-1 border-t border-neutral-700/40">
                      <button
                        onClick={() => {
                          const ids = Array.from(selectedFolderIds);
                          if (onBulkDeleteFolders) onBulkDeleteFolders(ids, false);
                          else ids.forEach((id) => onDeleteFolder(id));
                          setSelectedFolderIds(new Set());
                          setIsSelectionMode(false);
                        }}
                        className="px-1.5 py-1 rounded text-[10px] bg-neutral-700/60 hover:bg-neutral-600 text-white flex items-center justify-center space-x-1"
                        title="Removes selected folders from Fontier. Files on PC remain untouched!"
                      >
                        <Trash2 className="w-3 h-3 text-neutral-300" />
                        <span>Remove from App</span>
                      </button>
                      <button
                        onClick={() => {
                          const ids = Array.from(selectedFolderIds);
                          const names = folders.filter((f) => ids.includes(f.id)).map((f) => f.name);
                          setConfirmDeviceDelete({ folderIds: ids, folderNames: names });
                        }}
                        className="px-1.5 py-1 rounded text-[10px] bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center space-x-1"
                        title="Deletes folders from computer (moves to Recycle Bin)"
                      >
                        <AlertTriangle className="w-3 h-3 text-white" />
                        <span>Delete from PC</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                          ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a] focus:border-accent'
                          : 'bg-[#202020] border-[#404040] text-white focus:border-accent'
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

              {/* Hierarchical Folders Tree Rendering */}
              {foldersOpen && (() => {
                // Build hierarchical tree: roots and children map
                const rootFolders = folders.filter((f) => !f.parentId);
                const childrenMap = new Map<string, FolderItem[]>();
                folders.forEach((f) => {
                  if (f.parentId) {
                    if (!childrenMap.has(f.parentId)) childrenMap.set(f.parentId, []);
                    childrenMap.get(f.parentId)!.push(f);
                  }
                });

                const renderFolder = (folder: FolderItem, depth = 0): React.ReactNode => {
                  const isSelected = currentFilter === `folder-${folder.id}`;
                  const children = childrenMap.get(folder.id) || [];
                  const hasChildren = children.length > 0;
                  const isCollapsed = collapsedFolderIds.has(folder.id);
                  const count = counts.byFolder[folder.id] || 0;
                  const folderColor = folder.color || '#eab308'; // Default yellow folder color
                  const isSystemFolder = ['pixel', 'serif', 'sans', 'display', 'mono', 'script'].includes(folder.id);
                  const isChecked = selectedFolderIds.has(folder.id);

                  return (
                    <div key={folder.id} className="relative">
                      <div
                        style={{ paddingLeft: `${Math.max(4, depth * 14 + 4)}px` }}
                        className={`group w-full flex items-center justify-between py-1.5 pr-1.5 rounded text-left transition-colors cursor-pointer relative select-none ${
                          isSelected
                            ? isLight
                              ? 'bg-[#e2e8f0] text-[#0f172a] font-semibold'
                              : 'bg-[#2b2b2b] text-white font-medium'
                            : isLight
                            ? 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                            : 'text-[#aaaaaa] hover:bg-[#222222] hover:text-white'
                        }`}
                        onClick={(e) => {
                          if (e.shiftKey || e.ctrlKey || e.metaKey || isSelectionMode) {
                            if (!isSelectionMode) setIsSelectionMode(true);
                            if (!isSystemFolder) {
                              const targetIds = [folder.id, ...getDescendantFolderIds(folder.id)];
                              setSelectedFolderIds((prev) => {
                                const next = new Set(prev);
                                const allChecked = targetIds.every((id) => next.has(id));
                                if (allChecked) {
                                  targetIds.forEach((id) => next.delete(id));
                                } else {
                                  targetIds.forEach((id) => next.add(id));
                                }
                                return next;
                              });
                            }
                          } else {
                            onSelectFilter(`folder-${folder.id}`);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setContextMenu({ x: e.clientX, y: e.clientY, folder });
                        }}
                      >
                        <div className="flex items-center space-x-1.5 truncate min-w-0 flex-1">
                          {/* Bulk Selection Checkbox */}
                          {isSelectionMode && !isSystemFolder && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetIds = [folder.id, ...getDescendantFolderIds(folder.id)];
                                setSelectedFolderIds((prev) => {
                                  const next = new Set(prev);
                                  const allChecked = targetIds.every((id) => next.has(id));
                                  if (allChecked) {
                                    targetIds.forEach((id) => next.delete(id));
                                  } else {
                                    targetIds.forEach((id) => next.add(id));
                                  }
                                  return next;
                                });
                              }}
                              className="shrink-0 text-[#3b82f6] p-0.5 hover:opacity-80"
                              title={hasChildren ? 'Toggle this folder and all subfolders' : 'Toggle selection'}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-neutral-500" />
                              )}
                            </button>
                          )}


                          {/* Expand/Collapse Chevron for parents */}
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCollapsedFolderIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(folder.id)) next.delete(folder.id);
                                  else next.add(folder.id);
                                  return next;
                                });
                              }}
                              className="shrink-0 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 text-neutral-400"
                              title={isCollapsed ? 'Expand subfolders' : 'Collapse subfolders'}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : depth > 0 ? (
                            <span className="w-3 shrink-0" />
                          ) : null}

                          {/* Folder Icon */}
                          <FolderIcon
                            className="w-3.5 h-3.5 shrink-0 transition-colors"
                            style={{ color: folderColor }}
                          />

                          {/* Folder Name (full room with Scaler) */}
                          <span className="truncate text-xs" title={folder.name}>
                            {folder.name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 shrink-0 ml-1.5">
                          <span
                            className={`text-[10px] font-mono tabular-nums ${
                              isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
                            }`}
                          >
                            {count}
                          </span>

                          {/* Color picker trigger */}
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

                          {/* Rescan folder action */}
                          {onRescanFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onRescanFolder(folder.id);
                              }}
                              className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 ${
                                isLight ? 'text-[#94a3b8] hover:text-[#2563eb]' : 'text-[#777777] hover:text-[#60a5fa]'
                              }`}
                              title="Rescan folder for new fonts"
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                            </button>
                          )}

                          {/* Quick delete from Fontier (safe) */}
                          {!isSystemFolder && !isSelectionMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteFolder(folder.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-[#ef4444] transition-opacity p-0.5"
                              title="Remove folder from Fontier (leaves files on PC untouched)"
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

                      {/* Render child subfolders indented */}
                      {hasChildren && !isCollapsed && (
                        <div className="relative">
                          <div
                            style={{ left: `${depth * 14 + 10}px` }}
                            className="absolute top-0 bottom-1 w-[1px] bg-neutral-700/30 dark:bg-neutral-800 pointer-events-none"
                          />
                          {children.map((child) => renderFolder(child, depth + 1))}
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="mt-1 space-y-0.5 pl-0.5">
                    {rootFolders.map((folder) => renderFolder(folder, 0))}
                  </div>
                );
              })()}
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
              <Plus className="w-3.5 h-3.5 text-accent" />
              <span>Import Fonts</span>
            </button>
          </div>
        </div>

      {/* Resizer Splitter Drag Handle ("Scaler") positioned along the boundary between Sidebar and Main Content */}
      {isNavOpen && (
        <div
          onMouseDown={handleMouseDownResize}
          onDoubleClick={() => {
            setSidebarWidth(260);
            try {
              localStorage.setItem('fontier_sidebar_width', '260');
            } catch {}
          }}
          className="absolute top-0 bottom-0 -right-2 w-4 cursor-col-resize z-40 select-none flex items-center justify-center group"
          title="Click and drag to scale sidebar width (Double-click to reset)"
        >
          {/* Subtle vertical border line indicator */}
          <div
            className={`w-[2px] h-full transition-colors duration-150 pointer-events-none ${
              isResizing
                ? 'bg-accent shadow-[0_0_8px_var(--accent-color,#3b82f6)]'
                : 'bg-transparent group-hover:bg-accent/70'
            }`}
          />
          {/* Visible Center Grab Handle / Scaler Pill */}
          <div
            className={`absolute w-1.5 h-14 rounded-full transition-all duration-150 shadow-md flex flex-col items-center justify-center space-y-1 pointer-events-none ${
              isResizing
                ? 'bg-accent h-20 w-2 scale-110 shadow-lg ring-2 ring-accent/40'
                : isLight
                ? 'bg-[#cbd5e1] group-hover:bg-accent group-hover:h-20 group-hover:w-2'
                : 'bg-[#444444] group-hover:bg-accent group-hover:h-20 group-hover:w-2'
            }`}
          >
            <span className="w-0.5 h-0.5 rounded-full bg-white/70" />
            <span className="w-0.5 h-0.5 rounded-full bg-white/70" />
            <span className="w-0.5 h-0.5 rounded-full bg-white/70" />
          </div>
        </div>
      )}

      {/* Fullscreen drag overlay while resizing so cursor never loses tracking */}
      {isResizing && (
        <div className="fixed inset-0 z-[9999] cursor-col-resize select-none" />
      )}

      {/* Right-click Floating Context Menu for Folders */}
      {contextMenu && (() => {
        const isSystemFolder = ['pixel', 'serif', 'sans', 'display', 'mono', 'script'].includes(
          contextMenu.folder.id
        );
        const subfolderIds = getDescendantFolderIds(contextMenu.folder.id);
        const hasSubfolders = subfolderIds.length > 0;

        return (
          <div
            ref={contextMenuRef}
            style={{
              position: 'fixed',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            className={`z-50 w-52 rounded-md shadow-2xl py-1 border text-xs animate-in fade-in zoom-in-95 ${
              isLight
                ? 'bg-white border-[#cbd5e1] text-[#0f172a]'
                : 'bg-[#1e1e1e] border-[#383838] text-[#e0e0e0]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1 font-semibold border-b truncate text-[11px] opacity-70">
              {contextMenu.folder.name}
            </div>

            {/* Quick multi-select action */}
            {!isSystemFolder && (
              <>
                {hasSubfolders ? (
                  <button
                    onClick={() => {
                      setIsSelectionMode(true);
                      const allIds = [contextMenu.folder.id, ...subfolderIds];
                      setSelectedFolderIds((prev) => new Set([...Array.from(prev), ...allIds]));
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center px-3 py-1.5 space-x-2 text-left hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Folder & All Subfolders</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsSelectionMode(true);
                      setSelectedFolderIds((prev) => new Set([...Array.from(prev), contextMenu.folder.id]));
                      setContextMenu(null);
                    }}
                    className="w-full flex items-center px-3 py-1.5 space-x-2 text-left hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                    <span>Select Folder</span>
                  </button>
                )}
              </>
            )}

            {onRescanFolder && (
              <button
                onClick={() => {
                  onRescanFolder(contextMenu.folder.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center px-3 py-1.5 space-x-2 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rescan Folder</span>
              </button>
            )}

            {onMoveFolderUp && (
              <button
                onClick={() => {
                  onMoveFolderUp(contextMenu.folder.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center px-3 py-1.5 space-x-2 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <ArrowUp className="w-3.5 h-3.5" />
                <span>Move Up</span>
              </button>
            )}

            {onMoveFolderDown && (
              <button
                onClick={() => {
                  onMoveFolderDown(contextMenu.folder.id);
                  setContextMenu(null);
                }}
                className="w-full flex items-center px-3 py-1.5 space-x-2 text-left hover:bg-blue-600 hover:text-white transition-colors"
              >
                <ArrowDown className="w-3.5 h-3.5" />
                <span>Move Down</span>
              </button>
            )}

            <button
              onClick={() => {
                setActiveColorPickerFolderId(contextMenu.folder.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center px-3 py-1.5 space-x-2 text-left hover:bg-blue-600 hover:text-white transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Change Color</span>
            </button>

            {!isSystemFolder && (
              <>
                <button
                  onClick={() => {
                    const targetFolder = contextMenu.folder;
                    const allIds = [targetFolder.id, ...subfolderIds];
                    if (onBulkDeleteFolders) {
                      onBulkDeleteFolders(allIds, false);
                    } else {
                      allIds.forEach((id) => onDeleteFolder(id));
                    }
                    setContextMenu(null);
                  }}
                  className="w-full flex items-center px-3 py-1.5 space-x-2 text-left hover:bg-neutral-700 hover:text-white transition-colors border-t border-neutral-700/50 mt-1"
                  title="Hides this folder from Fontier. Leaves all font files on your computer untouched."
                >
                  <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>
                    {hasSubfolders
                      ? `Remove Folder & Subfolders (${subfolderIds.length})`
                      : 'Remove from Fontier'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    const targetFolder = contextMenu.folder;
                    const allIds = [targetFolder.id, ...subfolderIds];
                    const allNames = folders.filter((f) => allIds.includes(f.id)).map((f) => f.name);
                    setContextMenu(null);
                    setConfirmDeviceDelete({
                      folderIds: allIds,
                      folderNames: allNames,
                    });
                  }}
                  className="w-full flex items-center px-3 py-1.5 space-x-2 text-left text-[#ef4444] hover:bg-[#ef4444] hover:text-white transition-colors"
                  title="Permanently moves this folder and its files to the Recycle Bin"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {hasSubfolders
                      ? 'Delete from Device (Recycle Bin)...'
                      : 'Delete from Device...'}
                  </span>
                </button>
              </>
            )}
          </div>
        );
      })()}

      {/* Confirmation Modal for Delete from Device (Recycle Bin) */}
      {confirmDeviceDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className={`w-full max-w-sm rounded-xl p-5 shadow-2xl border ${
              isLight ? 'bg-white border-[#cbd5e1] text-[#0f172a]' : 'bg-[#1e1e1e] border-[#383838] text-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-3 text-red-500">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-semibold text-sm">Delete from Computer (Recycle Bin)?</h3>
            </div>

            <p className="text-xs text-neutral-400 mb-2 leading-relaxed">
              This will move the selected folder(s) and their font files from your hard drive directly to the <strong>Recycle Bin</strong>:
            </p>

            <div className="max-h-24 overflow-y-auto mb-4 p-2 rounded bg-black/20 border border-neutral-800 text-[11px] font-mono text-neutral-300">
              {confirmDeviceDelete.folderNames.map((name, i) => (
                <div key={i} className="truncate">• {name}</div>
              ))}
            </div>

            <p className="text-[11px] text-neutral-400 mb-4 italic">
              Tip: If you only want to hide them in Fontier without touching files on your PC, choose &quot;Remove from App&quot;.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmDeviceDelete(null)}
                className="px-3 py-1.5 rounded text-xs border border-neutral-600 text-neutral-300 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const ids = confirmDeviceDelete.folderIds;
                  if (onBulkDeleteFolders) {
                    onBulkDeleteFolders(ids, true);
                  } else if (onDeleteFolderFromDisk) {
                    ids.forEach((id) => onDeleteFolderFromDisk(id));
                  } else {
                    ids.forEach((id) => onDeleteFolder(id));
                  }
                  setConfirmDeviceDelete(null);
                  setSelectedFolderIds(new Set());
                  setIsSelectionMode(false);
                }}
                className="px-3 py-1.5 rounded text-xs bg-red-600 hover:bg-red-700 text-white font-medium shadow-sm flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Recycle Bin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};



