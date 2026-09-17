import React from 'react';
import { Heart, ChevronRight, Check, Info } from 'lucide-react';
import { FontItem, TextAlignment, ViewMode } from '../types';

interface FontRowProps {
  font: FontItem;
  previewText: string;
  fontSize: number;
  textColor: string;
  bgColor: string;
  alignment: TextAlignment;
  viewMode: ViewMode;
  isSelected?: boolean;
  onSelectFont?: (font: FontItem) => void;
  onToggleActive: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenDetail: (font: FontItem) => void;
  theme?: 'dark' | 'light';
}

export const FontRow: React.FC<FontRowProps> = ({
  font,
  previewText,
  fontSize,
  textColor,
  bgColor,
  alignment,
  viewMode,
  isSelected,
  onSelectFont,
  onToggleActive,
  onToggleFavorite,
  onOpenDetail,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const alignClass =
    alignment === 'center'
      ? 'text-center'
      : alignment === 'right'
      ? 'text-right'
      : 'text-left';

  if (viewMode === 'grid') {
    return (
      <div
        className={`rounded-md border transition-all overflow-hidden flex flex-col group ${
          isLight
            ? isSelected
              ? 'bg-white border-[#16a34a] ring-2 ring-[#16a34a]/30 shadow-md'
              : 'bg-white border-[#e2e8f0] hover:border-[#cbd5e1] shadow-2xs'
            : isSelected
            ? 'bg-[#1e1e1e] border-[#3b82f6] ring-1 ring-[#3b82f6]/50 shadow-lg shadow-blue-900/10'
            : 'bg-[#1e1e1e] border-[#2b2b2b] hover:border-[#404040]'
        }`}
        onClick={() => onSelectFont?.(font)}
      >
        {/* Header bar of card */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b text-xs ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#181818] border-[#262626]'
          }`}
        >
          <div className="flex items-center space-x-2 truncate">
            {/* Activation circle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleActive(font.id);
              }}
              className="relative shrink-0 focus:outline-none"
              title={font.active ? 'Deactivate font' : 'Activate font'}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border transition-all flex items-center justify-center ${
                  font.active
                    ? 'border-[#22c55e] bg-[#22c55e]'
                    : isLight
                    ? 'border-[#cbd5e1] hover:border-[#94a3b8] bg-white'
                    : 'border-[#555555] hover:border-[#888888] bg-transparent'
                }`}
              >
                {font.active && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
              </div>
            </button>

            <span
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(font);
              }}
              className={`font-medium cursor-pointer truncate ${
                isLight
                  ? 'text-[#0f172a] hover:text-[#16a34a]'
                  : 'text-[#e0e0e0] hover:text-[#4ade80]'
              }`}
              title={font.name}
            >
              {font.name}
            </span>
          </div>

          <div className="flex items-center space-x-1 shrink-0 ml-1">
            <span
              className={`text-[10px] uppercase font-mono px-1 py-0.5 rounded ${
                isLight ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#252525] text-[#888888]'
              }`}
            >
              {font.format}
            </span>
            {font.tags && font.tags.length > 0 && (
              <span
                className={`text-[9px] px-1 py-0.5 rounded font-medium truncate max-w-[65px] ${
                  isLight ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#222222] text-[#888888]'
                }`}
                title={font.tags.join(', ')}
              >
                {font.tags[0]}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelectFont?.(font);
              }}
              className={`p-1 rounded transition-colors ${
                isSelected
                  ? isLight
                    ? 'text-[#0284c7] bg-[#dbeafe]'
                    : 'text-[#38bdf8] bg-[#252525]'
                  : isLight
                  ? 'text-[#64748b] hover:text-[#0f172a]'
                  : 'text-[#666666] hover:text-[#cccccc]'
              }`}
              title="View Font Properties"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(font.id);
              }}
              className={`p-1 rounded transition-colors ${
                isLight ? 'hover:bg-[#f1f5f9]' : 'hover:bg-[#282828]'
              }`}
              title="Favorite"
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  font.favorite
                    ? 'text-[#ef4444] fill-[#ef4444]'
                    : isLight
                    ? 'text-[#94a3b8] hover:text-[#ef4444]'
                    : 'text-[#666666] hover:text-[#ef4444]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Preview canvas */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectFont?.(font);
            onOpenDetail(font);
          }}
          style={{ backgroundColor: bgColor }}
          className="p-4 flex-1 flex items-center justify-center cursor-pointer min-h-[120px] transition-colors relative"
          title="Click to view full font details and alphabets"
        >
          <div
            className={`w-full overflow-hidden break-words select-text ${alignClass}`}
            style={{
              fontFamily: font.fontFamily,
              color: textColor,
              fontSize: `${Math.min(fontSize, 56)}px`,
              lineHeight: 1.25,
            }}
          >
            {previewText || font.name}
          </div>
        </div>

        {/* Card footer */}
        <div
          className={`px-3 py-1.5 border-t flex items-center justify-between text-[11px] ${
            isLight
              ? 'bg-[#f8fafc] border-[#e2e8f0] text-[#64748b]'
              : 'bg-[#171717] border-[#262626] text-[#777777]'
          }`}
        >
          <span className="truncate max-w-[140px]" title={font.designer || 'Unknown'}>
            {font.designer || `${font.stylesCount} styles`}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(font);
            }}
            className={`flex items-center space-x-0.5 ${
              isLight
                ? 'text-[#0f172a] hover:text-[#16a34a]'
                : 'text-[#999999] hover:text-[#4ade80]'
            }`}
          >
            <span>Alphabets & Details</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Standard FontBase List Row View
  return (
    <div
      onClick={() => onSelectFont?.(font)}
      className={`border-b transition-colors group cursor-pointer ${
        isLight
          ? isSelected
            ? 'bg-[#f0fdf4] border-[#86efac] ring-1 ring-inset ring-[#16a34a]/30'
            : 'border-[#f1f5f9] hover:bg-[#f8fafc]'
          : isSelected
          ? 'bg-[#22272e] border-[#3b82f6]/60 ring-1 ring-inset ring-[#3b82f6]/30'
          : 'border-[#262626] hover:bg-[#202020]/50'
      }`}
    >
      {/* Top row metadata */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 text-xs">
        <div className="flex items-center space-x-2.5">
          {/* Active indicator circle (pure green) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive(font.id);
            }}
            className="shrink-0 focus:outline-none"
            title={font.active ? 'Deactivate font' : 'Activate font'}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full border transition-all flex items-center justify-center ${
                font.active
                  ? 'border-[#22c55e] bg-[#22c55e]'
                  : isLight
                  ? 'border-[#cbd5e1] hover:border-[#94a3b8] bg-white'
                  : 'border-[#555555] hover:border-[#888888] bg-transparent'
              }`}
            >
              {font.active && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
            </div>
          </button>

          {/* Font Name */}
          <span
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(font);
            }}
            className={`font-medium cursor-pointer ${
              isLight
                ? 'text-[#0f172a] hover:text-[#16a34a]'
                : 'text-[#d8d8d8] hover:text-[#4ade80]'
            }`}
          >
            {font.name}
          </span>

          {/* Format (TTF, OTF, etc) */}
          <span
            className={`text-[10px] font-mono tracking-wider px-1 py-0.5 rounded ${
              isLight ? 'bg-[#e2e8f0] text-[#475569]' : 'bg-[#202020] text-[#777777]'
            }`}
          >
            {font.format}
          </span>

          {/* Number of styles */}
          <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
            {font.stylesCount} {font.stylesCount === 1 ? 'style' : 'styles'}
          </span>

          {/* System Tags preview (e.g. Mono, Bold, Italic) */}
          {font.tags && font.tags.length > 0 && (
            <div className="hidden lg:flex items-center space-x-1">
              {font.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${
                    isLight
                      ? 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]'
                      : 'bg-[#202020] text-[#888888] border-[#2f2f2f]'
                  }`}
                >
                  {tag}
                </span>
              ))}
              {font.tags.length > 3 && (
                <span
                  className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                    isLight ? 'text-[#94a3b8]' : 'text-[#666666]'
                  }`}
                >
                  +{font.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Version preview if available */}
          {font.version && (
            <span
              className={`text-[10px] font-mono hidden md:inline truncate max-w-[120px] ${
                isLight ? 'text-[#94a3b8]' : 'text-[#666666]'
              }`}
            >
              {font.version.split(';')[0]}
            </span>
          )}

          {/* View link */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(font);
            }}
            className="text-[11px] text-[#0284c7] hover:underline cursor-pointer ml-1"
          >
            Alphabets
          </button>
        </div>

        {/* Right side row controls */}
        <div className="flex items-center space-x-1.5">
          {/* Properties Panel Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectFont?.(font);
            }}
            className={`p-1 rounded transition-colors text-xs flex items-center space-x-1 ${
              isSelected
                ? isLight
                  ? 'bg-[#dbeafe] text-[#0284c7]'
                  : 'bg-[#3b82f6]/20 text-[#38bdf8]'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                : 'text-[#666666] hover:text-[#cccccc] hover:bg-[#252525]'
            }`}
            title="Show Properties & Licensing Panel"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="text-[10px] hidden lg:inline">Properties</span>
          </button>

          {/* Favorite button with fully vibrant red */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(font.id);
            }}
            className="p-1 transition-colors"
            title={font.favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                font.favorite
                  ? 'text-[#ef4444] fill-[#ef4444]'
                  : isLight
                  ? 'text-[#94a3b8] hover:text-[#ef4444]'
                  : 'text-[#555555] hover:text-[#ef4444]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Preview text box (user-customizable bg color and text color!) */}
      <div
        style={{ backgroundColor: bgColor }}
        onClick={(e) => {
          e.stopPropagation();
          onSelectFont?.(font);
          onOpenDetail(font);
        }}
        className="px-4 py-3 mx-3 my-1.5 rounded-sm cursor-pointer hover:ring-1 hover:ring-[#3b82f6]/50 transition-all select-text"
        title="Click to open page with full alphabet & glyphs"
      >
        <p
          className={`overflow-x-auto whitespace-pre-wrap leading-tight tracking-normal ${alignClass}`}
          style={{
            fontFamily: font.fontFamily,
            color: textColor,
            fontSize: `${fontSize}px`,
          }}
        >
          {previewText || font.name}
        </p>
      </div>
    </div>
  );
};

