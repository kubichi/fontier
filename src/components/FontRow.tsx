import React, { useEffect, useMemo } from 'react';
import { Heart, ChevronRight, Check, Info } from 'lucide-react';
import { FontItem, TextAlignment, ViewMode } from '../types';
import { ensureFontLoaded, unregisterFont } from '../utils/fontStorage';

interface FontRowProps {
  font: FontItem;
  previewText: string;
  fontSize: number;
  textColor: string;
  bgColor: string;
  alignment: TextAlignment;
  viewMode: ViewMode;
  isSelected?: boolean;
  isCompact?: boolean;
  onSelectFont?: (font: FontItem) => void;
  onToggleActive: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onOpenDetail: (font: FontItem) => void;
  theme?: 'dark' | 'light';
}

export const FontRow: React.FC<FontRowProps> = React.memo(({
  font,
  previewText,
  fontSize,
  textColor,
  bgColor,
  alignment,
  viewMode,
  isSelected = false,
  isCompact = false,
  onSelectFont,
  onToggleActive,
  onToggleFavorite,
  onOpenDetail,
  theme = 'dark',
}) => {
  // Lazy-load font face into Chromium font cache ONLY when this row is in viewport
  useEffect(() => {
    ensureFontLoaded(font);
  }, [font.id, font.name, font.fontFamily, font.filePath, font.provider]);

  const isLight = theme === 'light';
  const alignClass =
    alignment === 'center'
      ? 'text-center'
      : alignment === 'right'
      ? 'text-right'
      : 'text-left';

  const isolatedFontFamily = useMemo(() => {
    const clean = (font.name || font.fontFamily.split(',')[0]).replace(/['"]/g, '').trim();
    return `"${clean}", ${font.fontFamily}`;
  }, [font.name, font.fontFamily]);

  const gridDisplayGlyphs = useMemo(() => {
    if (font.supportedCodepoints && font.supportedCodepoints.length > 0) {
      if (font.supportedCodepoints.includes(65) || font.supportedCodepoints.includes(97)) {
        return 'Aa';
      }
      const validCps = font.supportedCodepoints.filter((cp) => (cp >= 33 && cp < 127) || cp >= 160);
      if (validCps.length >= 2) {
        return String.fromCodePoint(validCps[0], validCps[1]);
      } else if (validCps.length === 1) {
        return String.fromCodePoint(validCps[0]);
      }
    }
    return 'Aa';
  }, [font.supportedCodepoints]);

  const rowPreviewText = useMemo(() => {
    // If font has known supported codepoints, check if it supports the Latin alphabet
    if (font.supportedCodepoints && font.supportedCodepoints.length > 0) {
      const hasLatin = font.supportedCodepoints.some((cp) => (cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122));
      if (!hasLatin) {
        // Font does NOT support standard Latin alphabet (e.g., MiTypeClock, number/clock fonts, math, symbols)
        if (previewText) {
          const supportedChars = Array.from(previewText).filter((ch) => {
            const code = ch.codePointAt(0);
            return code !== undefined && font.supportedCodepoints!.includes(code);
          });
          // If the user entered custom text with characters supported by the font (e.g. "12:00" or "+ -"), show them
          if (supportedChars.length > 0 && supportedChars.length >= previewText.replace(/\s+/g, '').length * 0.35) {
            return supportedChars.join('');
          }
        }
        // Otherwise, never display fallback Times New Roman / Arial letters; display the font's actual glyphs!
        const sample = font.supportedCodepoints
          .filter((cp) => (cp >= 33 && cp < 127) || cp >= 160)
          .slice(0, 24)
          .map((cp) => String.fromCodePoint(cp))
          .join(' ');
        if (sample) return sample;
        return '—';
      }
    }
    if (previewText) return previewText;
    return font.name;
  }, [previewText, font.name, font.supportedCodepoints]);

  // Ensure high contrast in grid view on dark/light background cards
  const gridTextColor = useMemo(() => {
    if (!isLight) {
      // In dark theme, card background is #1d1d1d. If textColor is black or dark, adapt to white
      if (!textColor || textColor === '#000000' || textColor === '#000' || textColor === '#0f172a' || textColor === '#111827' || textColor === '#111111' || textColor === '#1e293b') {
        return '#ffffff';
      }
    } else {
      // In light theme, card background is #ffffff. If textColor is white or very light, adapt to dark
      if (textColor === '#ffffff' || textColor === '#fff' || textColor === '#f8fafc' || textColor === '#f1f5f9' || textColor === '#e2e8f0') {
        return '#0f172a';
      }
    }
    return textColor;
  }, [textColor, isLight]);

  if (viewMode === 'grid') {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelectFont?.(font);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpenDetail(font);
        }}
        className={`relative aspect-square p-3 flex flex-col items-center justify-between rounded-lg border transition-all cursor-pointer group ${
          isLight
            ? 'bg-white hover:bg-gray-50 border-gray-200 hover:border-accent'
            : 'bg-[#1d1d1d] hover:bg-[#252525] border-[#2a2a2a] hover:border-accent'
        } ${isSelected ? 'ring-2 ring-accent' : ''}`}
        title={`${font.name} (Click to select, double-click to view glyphs)`}
      >
        {font.active && (
          <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(font);
          }}
          className="absolute top-2 left-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-[#888888] hover:text-white transition-opacity"
          title="Open glyphs and styles"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        
        <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
          <span
            className="select-none transition-transform group-hover:scale-105"
            style={{
              fontFamily: isolatedFontFamily,
              color: gridTextColor,
              fontSize: `${Math.max(22, Math.min(68, Math.round(fontSize * 0.9)))}px`,
              fontSynthesis: 'none',
            }}
          >
            {gridDisplayGlyphs}
          </span>
        </div>

        <div className="w-full text-center mt-1 flex flex-col items-center justify-end">
          <div className={`text-xs font-medium truncate w-full ${isLight ? 'text-gray-900' : 'text-gray-200'}`}>
            {font.name}
          </div>
          <span className="text-[10px] text-[#777777] mt-0.5">
            {font.stylesCount || font.styles?.length || 1} {(font.stylesCount || font.styles?.length || 1) === 1 ? 'style' : 'styles'}
          </span>
        </div>
      </div>
    );
  }

  // Standard FontBase List Row View
  return (
    <div
      onClick={() => onSelectFont?.(font)}
      style={{ minHeight: isCompact ? '68px' : '96px' }}
      className={`border-b transition-colors group cursor-pointer ${
        isLight
          ? isSelected
            ? 'bg-accent-subtle border-accent ring-1 ring-inset ring-accent'
            : 'border-[#f1f5f9] hover:bg-[#f8fafc]'
          : isSelected
          ? 'bg-accent-subtle border-accent ring-1 ring-inset ring-accent'
          : 'border-[#262626] hover:bg-[#202020]/50'
      }`}
    >
      {/* Top row metadata */}
      <div className={`flex items-center justify-between ${isCompact ? 'px-3 pt-1.5 pb-0.5' : 'px-4 pt-3 pb-1'} text-xs`}>
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
                ? 'text-[#0f172a] hover:text-accent'
                : 'text-[#d8d8d8] hover:text-accent'
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
        </div>

        {/* Right side row controls */}
        <div className="flex items-center space-x-1.5">
          {/* Properties Panel Toggle Button (Icon only) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectFont?.(font);
            }}
            className={`p-1 rounded transition-colors text-xs flex items-center justify-center ${
              isSelected
                ? 'bg-accent-subtle text-accent'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0]'
                : 'text-[#666666] hover:text-[#cccccc] hover:bg-[#252525]'
            }`}
            title="Show Properties & Specs Panel"
          >
            <Info className="w-3.5 h-3.5" />
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
        className={`${
          isCompact ? 'px-3 py-1.5 mx-2 my-0.5' : 'px-4 py-3 mx-3 my-1.5'
        } rounded-sm cursor-pointer hover:ring-1 hover:ring-accent transition-all select-text`}
        title="Click to open page with full alphabet & glyphs"
      >
        <p
          className={`overflow-x-auto whitespace-pre-wrap leading-tight tracking-normal ${alignClass}`}
          style={{
            fontFamily: isolatedFontFamily,
            color: textColor,
            fontSize: `${isCompact ? Math.max(14, Math.round(fontSize * 0.88)) : fontSize}px`,
          }}
        >
          {rowPreviewText}
        </p>
      </div>
    </div>
  );
});

FontRow.displayName = 'FontRow';

