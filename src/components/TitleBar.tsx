import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, Minus, Square, X, Check, RotateCcw, Clock } from 'lucide-react';
import { FontFilters } from '../types';

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FontFilters;
  onUpdateFilters: (newFilters: Partial<FontFilters>) => void;
  onResetFilters: () => void;
  theme?: 'dark' | 'light';
  showControls?: boolean;
}

const CATEGORIES = ['All', 'Sans-Serif', 'Serif', 'Display', 'Monospace', 'Handwriting'];
const FORMATS = [
  { label: 'All', value: 'all' },
  { label: 'TTF', value: 'ttf' },
  { label: 'OTF', value: 'otf' },
  { label: 'WOFF', value: 'woff' },
  { label: 'WOFF2', value: 'woff2' },
];

// Crisp inline vector logo that renders flawlessly in both web and Electron file:// environments
const FontierLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 160 160"
    className={`${className} shrink-0 rounded-xs shadow-xs select-none`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="2" width="156" height="156" rx="36" fill="#14161b" stroke="#2c303a" strokeWidth="4" />
    <path
      d="M 140,36 L 140,50 L 62,50 C 44,50 36,60 36,78 L 36,122 L 22,122 L 22,76 C 22,48 38,36 64,36 Z"
      fill="#ffffff"
    />
    <path
      d="M 140,72 L 140,86 L 66,86 C 54,86 42,92 36,101 L 36,83 C 44,75 54,72 66,72 Z"
      fill="#cfd6e0"
    />
  </svg>
);

export const TitleBar: React.FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onUpdateFilters,
  onResetFilters,
  theme = 'dark',
  showControls = true,
}) => {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  const [platform, setPlatform] = useState<string>(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.platform) {
      return (window as any).electronAPI.platform;
    }
    if (typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || navigator.platform)) {
      return 'darwin';
    }
    if (typeof navigator !== 'undefined' && /Linux/.test(navigator.userAgent || navigator.platform)) {
      return 'linux';
    }
    return 'win32';
  });
  useEffect(() => {
    const api = (window as any).electronAPI || (window as any).electron;
    if (typeof window !== 'undefined' && api?.getPlatform) {
      api.getPlatform().then(setPlatform);
    }
  }, []);
  const isMac = platform === 'darwin';
  const isLinux = platform === 'linux';

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fontier_search_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveSearchToHistory(searchQuery);
    }
  };

  const saveSearchToHistory = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const newHistory = [trimmed, ...searchHistory.filter((h) => h !== trimmed)].slice(0, 12);
    setSearchHistory(newHistory);
    localStorage.setItem('fontier_search_history', JSON.stringify(newHistory));
    setIsSearchFocused(false);
  };

  const removeHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    const newHistory = searchHistory.filter(h => h !== itemToRemove);
    setSearchHistory(newHistory);
    localStorage.setItem('fontier_search_history', JSON.stringify(newHistory));
  };

  const clearHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('fontier_search_history');
  };
  
  const handleHistorySelect = (item: string) => {
    onSearchChange(item);
    saveSearchToHistory(item);
  };

  // Close search history popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    if (isSearchFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchFocused]);

  // Desktop window actions
  const handleMinimize = () => {
    const api = (window as any).electronAPI || (window as any).electron;
    if (api?.minimize) {
      api.minimize();
    }
  };

  const handleMaximize = () => {
    const api = (window as any).electronAPI || (window as any).electron;
    if (api?.maximize) {
      api.maximize();
    }
    setIsMaximized((prev) => !prev);
  };

  const handleClose = () => {
    const api = (window as any).electronAPI || (window as any).electron;
    if (api?.close) {
      api.close();
    }
  };

  // Allow double-clicking on empty title bar region to maximize/restore (standard Windows behavior)
  const handleTitleBarDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.app-no-drag')) {
      return;
    }
    handleMaximize();
  };

  // Close filter popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    if (showFilterMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterMenu]);

  const hasActiveFilters =
    Boolean(filters.category && filters.category !== 'All') ||
    Boolean(filters.format && filters.format.toLowerCase() !== 'all') ||
    Boolean(filters.status && filters.status !== 'all') ||
    Boolean(filters.provider && filters.provider !== 'all');

  return (
    <header
      onDoubleClick={handleTitleBarDoubleClick}
      className={`h-10 border-b flex items-center justify-between px-3 select-none text-xs z-30 shrink-0 transition-colors app-drag-region ${
        isLight
          ? 'bg-[#f8f9fa] border-[#e2e8f0] text-[#64748b]'
          : 'bg-[#161616] border-[#262626] text-[#a0a0a0]'
      }`}
    >
      {/* Left section: Clean application branding */}
      <div className={`flex items-center space-x-2 app-no-drag ${isMac ? 'pl-[76px]' : ''}`}>
        <span
          className={`font-semibold text-xs tracking-tight flex items-center gap-2 ${
            isLight ? 'text-[#0f172a]' : 'text-white'
          }`}
        >
          <FontierLogo className="w-4 h-4" />
          <span className="font-semibold tracking-tight">Fontier</span>
        </span>
      </div>

      {/* Middle section: Global Font Search & Filter Dropdown */}
      <div className="flex-1 max-w-xl mx-4 flex items-center justify-center relative app-no-drag" ref={filterMenuRef}>
        <div className="relative w-full max-w-md" ref={searchContainerRef}>
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className={`w-3.5 h-3.5 ${isLight ? 'text-[#94a3b8]' : 'text-[#666666]'}`} />
          </div>
          <input
            id="fontier-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search fonts by name, designer, format..."
            className={`w-full h-7 pl-8 pr-16 text-xs rounded-md border focus:outline-none transition-all ${
              isLight
                ? 'bg-[#ffffff] hover:bg-[#f8fafc] focus:bg-[#ffffff] text-[#0f172a] placeholder-[#94a3b8] border-[#cbd5e1] focus:border-accent'
                : 'bg-[#202020] hover:bg-[#252525] focus:bg-[#272727] text-[#e0e0e0] placeholder-[#666666] border-[#303030] focus:border-accent'
            }`}
          />

          <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center space-x-1">
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className={`p-1 transition-colors ${
                  isLight ? 'text-[#94a3b8] hover:text-[#0f172a]' : 'text-[#888888] hover:text-[#e0e0e0]'
                }`}
                title="Clear search query"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Filter Toggle Button */}
            <button
              id="search-filter-button"
              onClick={() => setShowFilterMenu((prev) => !prev)}
              className={`p-1 rounded transition-colors relative ${
                hasActiveFilters
                  ? 'text-accent bg-accent-subtle ring-1 ring-accent'
                  : isLight
                  ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                  : 'text-[#888888] hover:text-[#e0e0e0] hover:bg-[#2c2c2c]'
              }`}
              title="Filter by category, format, status, or source"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {hasActiveFilters && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent"
                />
              )}
            </button>
          </div>

          {/* Search History Dropdown */}
          {isSearchFocused && searchHistory.length > 0 && (
            <div
              className={`absolute top-full left-0 right-0 mt-1 border rounded-lg shadow-xl z-50 overflow-hidden ${
                isLight ? 'bg-[#ffffff] border-[#cbd5e1]' : 'bg-[#1e1e1e] border-[#333]'
              }`}
            >
              {(() => {
                const filteredHistory = searchQuery 
                  ? searchHistory.filter(h => h.toLowerCase().includes(searchQuery.toLowerCase()))
                  : searchHistory;
                if (filteredHistory.length === 0) return null;
                return (
                  <div className="py-1">
                    {filteredHistory.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleHistorySelect(item)}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer text-xs transition-colors ${
                          isLight ? 'hover:bg-[#f1f5f9] text-[#334155]' : 'hover:bg-[#2a2a2a] text-[#cccccc]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className={`w-3.5 h-3.5 ${isLight ? 'text-[#94a3b8]' : 'text-[#666]'}`} />
                          <span>{item}</span>
                        </div>
                        <button
                          onClick={(e) => removeHistoryItem(e, item)}
                          className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${
                            isLight ? 'text-[#94a3b8] hover:text-[#ef4444]' : 'text-[#666] hover:text-[#ef4444]'
                          }`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {searchHistory.length > 0 && (
                      <div className={`mt-1 pt-1 border-t ${isLight ? 'border-[#e2e8f0]' : 'border-[#333]'}`}>
                        <button
                          onClick={clearHistory}
                          className={`w-full text-center px-3 py-2 text-[11px] font-medium transition-colors ${
                            isLight ? 'text-[#0f172a] hover:bg-[#f1f5f9]' : 'text-[#a0a0a0] hover:bg-[#2a2a2a] hover:text-white'
                          }`}
                        >
                          Clear search history
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Filter Dropdown Popover */}
        {showFilterMenu && (
          <div
            className={`absolute top-9 w-full max-w-md rounded-lg shadow-2xl border p-3.5 z-50 space-y-3 animate-in fade-in-50 zoom-in-95 ${
              isLight
                ? 'bg-[#ffffff] border-[#e2e8f0] text-[#1e293b] shadow-xl'
                : 'bg-[#1f1f1f] border-[#383838] text-[#dddddd]'
            }`}
          >
            <div
              className={`flex items-center justify-between pb-2 border-b ${
                isLight ? 'border-[#e2e8f0]' : 'border-[#2e2e2e]'
              }`}
            >
              <span className={`text-xs font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Search & Library Filters
              </span>
              {hasActiveFilters && (
                <button
                  onClick={onResetFilters}
                  className="text-[11px] text-accent hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <label
                className={`text-[10px] font-semibold uppercase tracking-wider block mb-1.5 ${
                  isLight ? 'text-[#64748b]' : 'text-[#888888]'
                }`}
              >
                Category
              </label>
              <div className="flex flex-wrap gap-1">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onUpdateFilters({ category: cat })}
                    className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                      filters.category === cat
                        ? 'bg-accent-subtle border-accent text-accent font-semibold'
                        : isLight
                        ? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                        : 'bg-[#252525] border-[#333333] text-[#aaaaaa] hover:text-white hover:bg-[#2d2d2d]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Format Filter */}
            <div>
              <label
                className={`text-[10px] font-semibold uppercase tracking-wider block mb-1.5 ${
                  isLight ? 'text-[#64748b]' : 'text-[#888888]'
                }`}
              >
                Format
              </label>
              <div className="flex flex-wrap gap-1">
                {FORMATS.map((fmt) => {
                  const isSelected = filters.format?.toLowerCase() === fmt.value.toLowerCase();
                  return (
                    <button
                      key={fmt.value}
                      type="button"
                      onClick={() => onUpdateFilters({ format: fmt.value })}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                        isSelected
                          ? 'bg-accent-subtle border-accent text-accent font-semibold'
                          : isLight
                          ? 'bg-[#f1f5f9] border-[#e2e8f0] text-[#475569] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                          : 'bg-[#252525] border-[#333333] text-[#aaaaaa] hover:text-white hover:bg-[#2d2d2d]'
                      }`}
                    >
                      {fmt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status & Source Filter */}
            <div
              className={`grid grid-cols-2 gap-2 pt-1 border-t ${
                isLight ? 'border-[#e2e8f0]' : 'border-[#2a2a2a]'
              }`}
            >
              <div>
                <label
                  className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${
                    isLight ? 'text-[#64748b]' : 'text-[#888888]'
                  }`}
                >
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    onUpdateFilters({
                      status: e.target.value as FontFilters['status'],
                    })
                  }
                  className={`w-full text-xs rounded px-2 py-1 focus:outline-none border ${
                    isLight
                      ? 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1] focus:border-accent'
                      : 'bg-[#242424] text-[#dddddd] border-[#383838] focus:border-accent'
                  }`}
                >
                  <option value="all">All Fonts</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                  <option value="favorites">Favorites Only</option>
                </select>
              </div>

              <div>
                <label
                  className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${
                    isLight ? 'text-[#64748b]' : 'text-[#888888]'
                  }`}
                >
                  Source
                </label>
                <select
                  value={filters.provider}
                  onChange={(e) =>
                    onUpdateFilters({
                      provider: e.target.value as FontFilters['provider'],
                    })
                  }
                  className={`w-full text-xs rounded px-2 py-1 focus:outline-none border ${
                    isLight
                      ? 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1] focus:border-accent'
                      : 'bg-[#242424] text-[#dddddd] border-[#383838] focus:border-accent'
                  }`}
                >
                  <option value="all">All Sources</option>
                  <option value="local">Local Folder Only</option>
                  <option value="google">Google Fonts Only</option>
                  <option value="system">Windows System Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right section: Window Chrome (Windows only) */}
      {!isMac && !isLinux && showControls && (
        <div className="flex items-center space-x-1 app-no-drag">
          <button
            onClick={handleMinimize}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
              isLight
                ? 'hover:bg-[#e2e8f0] text-[#64748b] hover:text-[#0f172a]'
                : 'hover:bg-[#2a2a2a] text-[#888888] hover:text-[#e0e0e0]'
            }`}
            title="Minimize"
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={handleMaximize}
            className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
              isLight
                ? 'hover:bg-[#e2e8f0] text-[#64748b] hover:text-[#0f172a]'
                : 'hover:bg-[#2a2a2a] text-[#888888] hover:text-[#e0e0e0]'
            }`}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? (
              <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M2.5 1.5H8.5V7.5" />
                <rect x="1" y="2.5" width="6" height="6" />
              </svg>
            ) : (
              <Square className="w-2.5 h-2.5" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center hover:bg-[#e81123] text-[#888888] hover:text-white rounded transition-colors"
            title="Close"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </header>
  );
};


