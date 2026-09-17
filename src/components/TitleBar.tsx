import React, { useState, useRef, useEffect } from 'react';
import { Search, SlidersHorizontal, Minus, Square, X, Check, RotateCcw } from 'lucide-react';
import { FontFilters } from '../types';

interface TitleBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: FontFilters;
  onUpdateFilters: (newFilters: Partial<FontFilters>) => void;
  onResetFilters: () => void;
  theme?: 'dark' | 'light';
}

const CATEGORIES = ['All', 'Sans Serif', 'Serif', 'Slab Serif', 'Display', 'Monospace', 'Handwriting', 'Pixel'];
const FORMATS = [
  { label: 'All', value: 'all' },
  { label: 'TTF', value: 'ttf' },
  { label: 'OTF', value: 'otf' },
  { label: 'WOFF', value: 'woff' },
  { label: 'WOFF2', value: 'woff2' },
];

export const TitleBar: React.FC<TitleBarProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onUpdateFilters,
  onResetFilters,
  theme = 'dark',
}) => {
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

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
      className={`h-10 border-b flex items-center justify-between px-3 select-none text-xs z-30 shrink-0 transition-colors ${
        isLight
          ? 'bg-[#f8f9fa] border-[#e2e8f0] text-[#64748b]'
          : 'bg-[#161616] border-[#262626] text-[#a0a0a0]'
      }`}
    >
      {/* Left section: Clean application branding */}
      <div className="flex items-center space-x-2">
        <span
          className={`font-semibold text-xs tracking-tight flex items-center gap-2 ${
            isLight ? 'text-[#0f172a]' : 'text-white'
          }`}
        >
          <img
            src="/icon.svg"
            alt="Fontier Icon"
            className="w-4 h-4 rounded-xs shadow-xs object-contain shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="font-semibold tracking-tight">Fontier</span>
        </span>
      </div>

      {/* Middle section: Global Font Search & Filter Dropdown */}
      <div className="flex-1 max-w-xl mx-4 flex items-center justify-center relative" ref={filterMenuRef}>
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className={`w-3.5 h-3.5 ${isLight ? 'text-[#94a3b8]' : 'text-[#666666]'}`} />
          </div>
          <input
            id="fontier-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search fonts by name, designer, format..."
            className={`w-full h-7 pl-8 pr-16 text-xs rounded-md border focus:outline-none transition-all ${
              isLight
                ? 'bg-[#ffffff] hover:bg-[#f8fafc] focus:bg-[#ffffff] text-[#0f172a] placeholder-[#94a3b8] border-[#cbd5e1] focus:border-[#22c55e]'
                : 'bg-[#202020] hover:bg-[#252525] focus:bg-[#272727] text-[#e0e0e0] placeholder-[#666666] border-[#303030] focus:border-[#4ade80]'
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
                  ? isLight
                    ? 'text-[#16a34a] bg-[#dcfce7] ring-1 ring-[#16a34a]/30'
                    : 'text-[#4ade80] bg-[#223326]'
                  : isLight
                  ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                  : 'text-[#888888] hover:text-[#e0e0e0] hover:bg-[#2c2c2c]'
              }`}
              title="Filter by category, format, status, or source"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {hasActiveFilters && (
                <span
                  className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                    isLight ? 'bg-[#16a34a]' : 'bg-[#4ade80]'
                  }`}
                />
              )}
            </button>
          </div>
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
                  className="text-[11px] text-[#0284c7] hover:underline flex items-center gap-1"
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
                        ? isLight
                          ? 'bg-[#dcfce7] border-[#22c55e] text-[#15803d] font-semibold'
                          : 'bg-[#2b3b2f] border-[#4ade80] text-white font-medium'
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
                          ? isLight
                            ? 'bg-[#dcfce7] border-[#22c55e] text-[#15803d] font-semibold'
                            : 'bg-[#2b3b2f] border-[#4ade80] text-white font-medium'
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
                      ? 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1] focus:border-[#22c55e]'
                      : 'bg-[#242424] text-[#dddddd] border-[#383838] focus:border-[#4ade80]'
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
                      ? 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1] focus:border-[#22c55e]'
                      : 'bg-[#242424] text-[#dddddd] border-[#383838] focus:border-[#4ade80]'
                  }`}
                >
                  <option value="all">All Sources</option>
                  <option value="local">Local Folder Only</option>
                  <option value="google">Google Fonts Only</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right section: Window Chrome */}
      <div className="flex items-center space-x-1">
        <button
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
          className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
            isLight
              ? 'hover:bg-[#e2e8f0] text-[#64748b] hover:text-[#0f172a]'
              : 'hover:bg-[#2a2a2a] text-[#888888] hover:text-[#e0e0e0]'
          }`}
          title="Maximize"
        >
          <Square className="w-2.5 h-2.5" />
        </button>
        <button
          className="w-7 h-7 flex items-center justify-center hover:bg-[#ef4444] text-[#888888] hover:text-white rounded transition-colors"
          title="Close"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
};


