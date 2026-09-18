import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Check,
  Heart,
  Copy,
  CheckCheck,
  ChevronDown,
  Info,
  Maximize2,
  ZoomIn,
  Globe,
} from 'lucide-react';
import opentype from 'opentype.js';
import { FontItem, DetailTab, TextAlignment, FontStyle } from '../types';
import { autoTagFontMetadata } from '../utils/autoTagger';
import { ensureFontLoaded, getFontBuffer } from '../utils/fontStorage';

interface FontDetailPageProps {
  font: FontItem;
  onBack: () => void;
  previewText: string;
  fontSize: number;
  textColor: string;
  bgColor: string;
  alignment: TextAlignment;
  onToggleActive: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateFont?: (id: string, updates: Partial<FontItem>) => void;
  theme?: 'dark' | 'light';
}

const WATERFALL_SIZES = [12, 14, 18, 24, 32, 42, 54, 72, 96];

export const FontDetailPage: React.FC<FontDetailPageProps> = ({
  font,
  onBack,
  previewText,
  fontSize,
  textColor,
  bgColor,
  alignment,
  onToggleActive,
  onToggleFavorite,
  onUpdateFont,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState<DetailTab>('glyphs');
  const [selectedStyle, setSelectedStyle] = useState<FontStyle>(
    font.styles[0] || { name: 'Regular', weight: 400, style: 'normal' }
  );
  const [selectedGlyph, setSelectedGlyph] = useState<string>('A');
  const [copiedGlyph, setCopiedGlyph] = useState(false);
  const [glyphFilter, setGlyphFilter] = useState<string>('all');
  const [supportedCps, setSupportedCps] = useState<number[]>(font.supportedCodepoints || []);

  const cleanFontFamily = useMemo(() => {
    return font.fontFamily.split(',')[0].trim();
  }, [font.fontFamily]);

  // Ensure font is loaded into Chromium font engine so glyphs and pangrams render correctly
  useEffect(() => {
    ensureFontLoaded(font);
  }, [font]);

  // If font lacks supportedCodepoints, parse on demand from binary buffer
  useEffect(() => {
    if (font.supportedCodepoints && font.supportedCodepoints.length > 0) {
      setSupportedCps(font.supportedCodepoints);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        let buf: ArrayBuffer | null = await getFontBuffer(font);
        if (!buf && font.filePath && typeof window !== 'undefined' && (window as any).electronAPI?.readFontFile) {
          buf = await (window as any).electronAPI.readFontFile(font.filePath);
        }
        if (buf && isMounted) {
          const parsed = opentype.parse(buf);
          const glyphMap = parsed.tables?.cmap?.glyphIndexMap;
          if (glyphMap) {
            const cps: number[] = [];
            for (const key of Object.keys(glyphMap)) {
              const cp = Number(key);
              if (cp <= 0) continue;
              const gIndex = glyphMap[cp];
              if (!gIndex) continue;
              const g = parsed.glyphs ? parsed.glyphs.get(gIndex) : null;
              if (!g) continue;
              // Only include characters with actual vector path commands (prevents empty boxes/dots)
              if (cp === 32 || (g.path && g.path.commands && g.path.commands.length > 0)) {
                cps.push(cp);
              }
            }
            setSupportedCps(cps);
            onUpdateFont?.(font.id, { supportedCodepoints: cps });
          }
        }
      } catch (e) {
        console.warn('Could not extract codepoints for glyph viewer:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [font.id, font.filePath, font.supportedCodepoints]);

  // Categorize verified existing glyphs into language & script blocks
  const glyphCategories = useMemo(() => {
    const cps = supportedCps.length > 0
      ? supportedCps
      : font.supportedCodepoints && font.supportedCodepoints.length > 0
      ? font.supportedCodepoints
      : [];

    const sorted = Array.from(new Set(cps)).sort((a, b) => a - b);

    const uppercase: string[] = [];
    const lowercase: string[] = [];
    const numbers: string[] = [];
    const punctuationSymbols: string[] = [];
    const latinExtendedTurkish: string[] = [];
    const arabic: string[] = [];
    const hebrew: string[] = [];
    const cyrillic: string[] = [];
    const cjk: string[] = [];
    const otherGlyphs: string[] = [];

    for (const cp of sorted) {
      if (cp < 32 || (cp >= 127 && cp < 160)) continue;
      const ch = String.fromCodePoint(cp);

      if (cp >= 0x41 && cp <= 0x5A) {
        uppercase.push(ch);
      } else if (cp >= 0x61 && cp <= 0x7A) {
        lowercase.push(ch);
      } else if (
        (cp >= 0x30 && cp <= 0x39) ||
        cp === 0x00B2 || cp === 0x00B3 || cp === 0x00B9 ||
        (cp >= 0x2150 && cp <= 0x218F)
      ) {
        numbers.push(ch);
      } else if (
        (cp >= 0x00C0 && cp <= 0x024F) ||
        cp === 0x011E || cp === 0x011F || // Ğ, ğ
        cp === 0x0130 || cp === 0x0131 || // İ, ı
        cp === 0x015E || cp === 0x015F    // Ş, ş
      ) {
        latinExtendedTurkish.push(ch);
      } else if (
        (cp >= 0x0600 && cp <= 0x06FF) ||
        (cp >= 0x0750 && cp <= 0x077F) ||
        (cp >= 0x08A0 && cp <= 0x08FF) ||
        (cp >= 0xFB50 && cp <= 0xFDFF) ||
        (cp >= 0xFE70 && cp <= 0xFEFF)
      ) {
        arabic.push(ch);
      } else if ((cp >= 0x0590 && cp <= 0x05FF) || (cp >= 0xFB1D && cp <= 0xFB4F)) {
        hebrew.push(ch);
      } else if ((cp >= 0x0400 && cp <= 0x04FF) || (cp >= 0x0500 && cp <= 0x052F)) {
        cyrillic.push(ch);
      } else if (
        (cp >= 0x3000 && cp <= 0x303F) ||
        (cp >= 0x3040 && cp <= 0x309F) ||
        (cp >= 0x30A0 && cp <= 0x30FF) ||
        (cp >= 0x4E00 && cp <= 0x9FFF) ||
        (cp >= 0x3400 && cp <= 0x4DBF) ||
        (cp >= 0xAC00 && cp <= 0xD7AF)
      ) {
        cjk.push(ch);
      } else if (
        (cp >= 0x20 && cp <= 0x2F) ||
        (cp >= 0x3A && cp <= 0x40) ||
        (cp >= 0x5B && cp <= 0x60) ||
        (cp >= 0x7B && cp <= 0x7E) ||
        (cp >= 0x00A0 && cp <= 0x00BF) ||
        (cp >= 0x2000 && cp <= 0x2BFF)
      ) {
        punctuationSymbols.push(ch);
      } else {
        otherGlyphs.push(ch);
      }
    }

    const all = sorted
      .filter((cp) => cp >= 32 && (cp < 127 || cp >= 160))
      .map((cp) => String.fromCodePoint(cp));

    return {
      all,
      uppercase,
      lowercase,
      numbers,
      punctuationSymbols,
      latinExtendedTurkish,
      arabic,
      hebrew,
      cyrillic,
      cjk,
      otherGlyphs,
    };
  }, [supportedCps, font.supportedCodepoints]);

  // Set selectedGlyph to first existing character if current selectedGlyph isn't available
  useEffect(() => {
    if (glyphCategories.all.length > 0 && !glyphCategories.all.includes(selectedGlyph)) {
      setSelectedGlyph(glyphCategories.all[0]);
    }
  }, [glyphCategories.all]);

  const alignClass =
    alignment === 'center'
      ? 'text-center'
      : alignment === 'right'
      ? 'text-right'
      : 'text-left';

  const copyCharacter = async (char: string) => {
    try {
      if (typeof window !== 'undefined' && window.electronAPI?.copyToClipboard) {
        await window.electronAPI.copyToClipboard(char);
      } else {
        await navigator.clipboard.writeText(char);
      }
      setCopiedGlyph(true);
      setTimeout(() => setCopiedGlyph(false), 1500);
    } catch {
      navigator.clipboard?.writeText(char);
      setCopiedGlyph(true);
      setTimeout(() => setCopiedGlyph(false), 1500);
    }
  };

  const getUnicodeHex = (char: string) => {
    const code = char.codePointAt(0);
    return code ? `U+${code.toString(16).toUpperCase().padStart(4, '0')}` : '';
  };

  const getHtmlEntity = (char: string) => {
    const code = char.codePointAt(0);
    return code ? `&#${code};` : '';
  };

  return (
    <div
      className={`flex-1 flex flex-col h-full overflow-hidden select-none transition-colors ${
        isLight ? 'bg-[#ffffff] text-[#334155]' : 'bg-[#181818] text-[#d0d0d0]'
      }`}
    >
      {/* Top Header Bar (matches FontBase Screenshot 2) */}
      <div
        className={`h-14 border-b flex items-center justify-between px-4 shrink-0 ${
          isLight ? 'bg-[#ffffff] border-[#e2e8f0]' : 'bg-[#1a1a1a] border-[#282828]'
        }`}
      >
        <div className="flex items-center space-x-3">
          {/* Back button */}
          <button
            onClick={onBack}
            className={`p-1.5 rounded transition-colors flex items-center space-x-1 ${
              isLight
                ? 'hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#0f172a]'
                : 'hover:bg-[#282828] text-[#999999] hover:text-white'
            }`}
            title="Back to font library"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Active status indicator circle */}
          <button
            onClick={() => onToggleActive(font.id)}
            className="focus:outline-none"
            title={font.active ? 'Deactivate font' : 'Activate font'}
          >
            <div
              className={`w-4 h-4 rounded-full border transition-all flex items-center justify-center ${
                font.active
                  ? 'border-[#22c55e] bg-[#22c55e]'
                  : isLight
                  ? 'border-[#cbd5e1] hover:border-[#94a3b8] bg-white'
                  : 'border-[#666666] hover:border-[#888888] bg-transparent'
              }`}
            >
              {font.active && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
            </div>
          </button>

          {/* Font Name & Weight selector dropdown */}
          <div className="flex items-center space-x-2">
            <h1
              className={`text-base font-semibold tracking-tight ${
                isLight ? 'text-[#0f172a]' : 'text-white'
              }`}
            >
              {font.name}
            </h1>
            <span className={isLight ? 'text-[#cbd5e1]' : 'text-[#666666]'}>—</span>
            <div className="relative inline-block">
              <select
                value={selectedStyle.name}
                onChange={(e) => {
                  const s = font.styles.find((st) => st.name === e.target.value);
                  if (s) setSelectedStyle(s);
                }}
                className={`text-xs font-medium py-1 pl-2.5 pr-7 rounded border focus:outline-none appearance-none cursor-pointer ${
                  isLight
                    ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a] border-[#cbd5e1] focus:border-accent'
                    : 'bg-[#242424] hover:bg-[#2b2b2b] text-[#e0e0e0] border-[#383838] focus:border-accent'
                }`}
              >
                {font.styles.map((s) => (
                  <option
                    key={s.name}
                    value={s.name}
                    className={isLight ? 'bg-white text-black' : 'bg-[#222222] text-white'}
                  >
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`w-3.5 h-3.5 absolute right-2 top-2 pointer-events-none ${
                  isLight ? 'text-[#64748b]' : 'text-[#888888]'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Favorite & Meta on right */}
        <div className="flex items-center space-x-2.5">
          {font.provider === 'Google' && (
            <span className="text-xs px-2 py-0.5 rounded border font-medium flex items-center space-x-1.5 bg-accent-subtle text-accent border-accent-subtle">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Google Fonts</span>
            </span>
          )}
          <span
            className={`text-xs px-2 py-0.5 rounded border font-mono ${
              isLight
                ? 'bg-[#f1f5f9] text-[#475569] border-[#cbd5e1]'
                : 'bg-[#252525] text-[#888888] border-[#333333]'
            }`}
          >
            {font.format}
          </span>
          <span className={`text-xs ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
            {font.stylesCount} {font.stylesCount === 1 ? 'style' : 'styles'}
          </span>
          <button
            onClick={() => onToggleFavorite(font.id)}
            className={`p-1.5 rounded transition-colors ${
              isLight
                ? 'hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#ef4444]'
                : 'hover:bg-[#282828] text-[#888888] hover:text-[#ef4444]'
            }`}
            title="Favorite"
          >
            <Heart
              className={`w-4 h-4 ${
                font.favorite ? 'text-[#ef4444] fill-[#ef4444]' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tabs navigation (Styles, Licenses, Waterfall, Glyphs, Details) */}
      <div
        className={`border-b px-6 flex space-x-6 text-xs shrink-0 ${
          isLight ? 'border-[#e2e8f0] bg-[#f8fafc]' : 'border-[#282828] bg-[#161616]'
        }`}
      >
        <button
          onClick={() => setActiveTab('glyphs')}
          className={`py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'glyphs'
              ? 'border-accent text-accent'
              : isLight
              ? 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              : 'border-transparent text-[#888888] hover:text-[#cccccc]'
          }`}
        >
          <span>Glyphs & Alphabets</span>
        </button>

        <button
          onClick={() => setActiveTab('styles')}
          className={`py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'styles'
              ? 'border-accent text-accent'
              : isLight
              ? 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              : 'border-transparent text-[#888888] hover:text-[#cccccc]'
          }`}
        >
          <span>Styles ({font.styles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('waterfall')}
          className={`py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'waterfall'
              ? 'border-accent text-accent'
              : isLight
              ? 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              : 'border-transparent text-[#888888] hover:text-[#cccccc]'
          }`}
        >
          <span>Waterfall</span>
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={`py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'details'
              ? 'border-accent text-accent'
              : isLight
              ? 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              : 'border-transparent text-[#888888] hover:text-[#cccccc]'
          }`}
        >
          <span>Details & License</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ==================== GLYPHS / ALPHABETS TAB ==================== */}
        {activeTab === 'glyphs' && (
          <div className="space-y-6">
            {/* Top Glyph Inspector Card */}
            <div className="bg-[#1f1f1f] rounded-lg border border-[#2e2e2e] p-5 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
              <div className="flex items-center space-x-6">
                {/* Enormous preview of selected glyph */}
                <div
                  className="w-24 h-24 rounded-lg flex items-center justify-center border border-[#3a3a3a] shadow-inner select-text transition-colors"
                  style={{ backgroundColor: bgColor }}
                >
                  <span
                    style={{
                      fontFamily: cleanFontFamily,
                      color: textColor,
                      fontWeight: selectedStyle.weight,
                      fontStyle: selectedStyle.style,
                      fontSize: '64px',
                      lineHeight: 1,
                    }}
                  >
                    {selectedGlyph}
                  </span>
                </div>

                {/* Glyph Metadata Details */}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl font-bold text-white tracking-wide">
                      Character: &apos;{selectedGlyph}&apos;
                    </span>
                    <button
                      onClick={() => copyCharacter(selectedGlyph)}
                      className="px-2 py-1 bg-[#2b2b2b] hover:bg-[#383838] text-xs text-[#cccccc] hover:text-white rounded border border-[#444] transition-colors flex items-center space-x-1"
                      title="Copy character"
                    >
                      {copiedGlyph ? (
                        <>
                          <CheckCheck className="w-3 h-3 text-[#22c55e]" />
                          <span className="text-[#22c55e] text-[11px]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="text-[11px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center space-x-4 text-xs font-mono text-[#888888]">
                    <span>Unicode: <strong className="text-accent">{getUnicodeHex(selectedGlyph)}</strong></span>
                    <span>HTML: <strong className="text-accent">{getHtmlEntity(selectedGlyph)}</strong></span>
                  </div>
                  <p className="text-xs text-[#999999] pt-1">
                    Rendered in {font.name} {selectedStyle.name}
                  </p>
                </div>
              </div>

              {/* Live interactive sentence preview */}
              <div className="w-full md:w-auto flex-1 max-w-md bg-[#181818] p-3 rounded border border-[#2b2b2b]">
                <span className="text-[10px] uppercase font-semibold text-[#777777] block mb-1">
                  {glyphCategories.uppercase.length === 0 && glyphCategories.lowercase.length === 0
                    ? 'Numerals & Symbols Preview'
                    : 'Alphabet Pangram Preview'}
                </span>
                <p
                  className="text-base text-[#e0e0e0] leading-snug break-words"
                  style={{
                    fontFamily: cleanFontFamily,
                    fontWeight: selectedStyle.weight,
                    fontStyle: selectedStyle.style,
                  }}
                >
                  {previewText ||
                    (glyphCategories.uppercase.length === 0 && glyphCategories.lowercase.length === 0
                      ? glyphCategories.numbers.join(' ') || glyphCategories.all.slice(0, 20).join(' ')
                      : glyphCategories.arabic.length > 0 && glyphCategories.uppercase.length === 0
                      ? 'نص تجريبي لعرض جماليات الخط العربي 0123456789'
                      : glyphCategories.hebrew.length > 0 && glyphCategories.uppercase.length === 0
                      ? 'דג סקרן שט בים מאוכזב ולפתע מצא חברה'
                      : glyphCategories.cjk.length > 0 && glyphCategories.uppercase.length === 0
                      ? '天地玄黃 宇宙洪荒 日月盈昃 辰宿列張'
                      : 'The quick brown fox jumps over the lazy dog. 0123456789')}
                </p>
              </div>
            </div>

            {/* Filter buttons for Glyphs: only show categories with actual glyphs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[#888888] font-medium mr-1">Filter:</span>
              {[
                { id: 'all', label: `All (${glyphCategories.all.length})` },
                ...(glyphCategories.uppercase.length > 0
                  ? [{ id: 'upper', label: `Uppercase (${glyphCategories.uppercase.length})` }]
                  : []),
                ...(glyphCategories.lowercase.length > 0
                  ? [{ id: 'lower', label: `Lowercase (${glyphCategories.lowercase.length})` }]
                  : []),
                ...(glyphCategories.numbers.length > 0
                  ? [{ id: 'numbers', label: `Numbers (${glyphCategories.numbers.length})` }]
                  : []),
                ...(glyphCategories.punctuationSymbols.length > 0
                  ? [{ id: 'symbols', label: `Symbols (${glyphCategories.punctuationSymbols.length})` }]
                  : []),
                ...(glyphCategories.latinExtendedTurkish.length > 0
                  ? [{ id: 'latin_ext', label: `Latin & Turkish (${glyphCategories.latinExtendedTurkish.length})` }]
                  : []),
                ...(glyphCategories.arabic.length > 0
                  ? [{ id: 'arabic', label: `Arabic (${glyphCategories.arabic.length})` }]
                  : []),
                ...(glyphCategories.hebrew.length > 0
                  ? [{ id: 'hebrew', label: `Hebrew (${glyphCategories.hebrew.length})` }]
                  : []),
                ...(glyphCategories.cyrillic.length > 0
                  ? [{ id: 'cyrillic', label: `Cyrillic (${glyphCategories.cyrillic.length})` }]
                  : []),
                ...(glyphCategories.cjk.length > 0
                  ? [{ id: 'cjk', label: `Chinese / Japanese (${glyphCategories.cjk.length})` }]
                  : []),
                ...(glyphCategories.otherGlyphs.length > 0
                  ? [{ id: 'other', label: `Other (${glyphCategories.otherGlyphs.length})` }]
                  : []),
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setGlyphFilter(pill.id)}
                  className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                    glyphFilter === pill.id
                      ? 'bg-accent-subtle border-accent text-accent font-medium'
                      : 'border-[#333333] text-[#888888] hover:border-[#555555] hover:text-[#cccccc]'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Empty / Provider Font Notice */}
            {glyphCategories.all.length === 0 && (
              <div className="bg-[#18202f] border border-[#23354d] p-8 rounded-xl text-center my-6 space-y-3 max-w-lg mx-auto">
                <Globe className="w-10 h-10 text-accent mx-auto mb-2 opacity-90" />
                <h4 className="text-sm font-semibold text-white">
                  {font.provider === 'Google' ? 'Google Web Fonts Stream' : 'Web / Provider Font'}
                </h4>
                <p className="text-xs text-[#94a3b8] leading-relaxed">
                  Individual OpenType vector tables and glyph maps are only available for locally imported font files (.ttf, .otf). Web provider fonts stream web font subsets directly to the renderer without exposing raw binary font tables.
                </p>
                <div className="pt-2 text-[11px] text-[#64748b]">
                  Full text previews, waterfall, and style variants remain fully functional.
                </div>
              </div>
            )}

            {/* Uppercase Alphabet Section */}
            {(glyphFilter === 'all' || glyphFilter === 'upper') && glyphCategories.uppercase.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Uppercase Alphabet ({glyphCategories.uppercase.length})
                </h3>
                <div className="grid grid-cols-8 sm:grid-cols-13 gap-2">
                  {glyphCategories.uppercase.map((char, i) => (
                    <button
                      key={`upper-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-2xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lowercase Alphabet Section */}
            {(glyphFilter === 'all' || glyphFilter === 'lower') && glyphCategories.lowercase.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Lowercase Alphabet ({glyphCategories.lowercase.length})
                </h3>
                <div className="grid grid-cols-8 sm:grid-cols-13 gap-2">
                  {glyphCategories.lowercase.map((char, i) => (
                    <button
                      key={`lower-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-2xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Numbers Section */}
            {(glyphFilter === 'all' || glyphFilter === 'numbers') && glyphCategories.numbers.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Numerals (0-9) ({glyphCategories.numbers.length})
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {glyphCategories.numbers.map((char, i) => (
                    <button
                      key={`num-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-2xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Latin Extended & Turkish Section */}
            {(glyphFilter === 'all' || glyphFilter === 'latin_ext') && glyphCategories.latinExtendedTurkish.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Latin Extended & Turkish ({glyphCategories.latinExtendedTurkish.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {glyphCategories.latinExtendedTurkish.map((char, i) => (
                    <button
                      key={`latinext-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Arabic Script Section */}
            {(glyphFilter === 'all' || glyphFilter === 'arabic') && glyphCategories.arabic.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Arabic Script ({glyphCategories.arabic.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {glyphCategories.arabic.map((char, i) => (
                    <button
                      key={`arabic-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Hebrew Script Section */}
            {(glyphFilter === 'all' || glyphFilter === 'hebrew') && glyphCategories.hebrew.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Hebrew Script ({glyphCategories.hebrew.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {glyphCategories.hebrew.map((char, i) => (
                    <button
                      key={`hebrew-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cyrillic Script Section */}
            {(glyphFilter === 'all' || glyphFilter === 'cyrillic') && glyphCategories.cyrillic.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Cyrillic Script ({glyphCategories.cyrillic.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {glyphCategories.cyrillic.map((char, i) => (
                    <button
                      key={`cyrillic-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CJK Section */}
            {(glyphFilter === 'all' || glyphFilter === 'cjk') && glyphCategories.cjk.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Chinese / Japanese / Korean ({glyphCategories.cjk.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {glyphCategories.cjk.slice(0, 300).map((char, i) => (
                    <button
                      key={`cjk-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Symbols & Punctuation Section */}
            {(glyphFilter === 'all' || glyphFilter === 'symbols') && glyphCategories.punctuationSymbols.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Symbols & Punctuation ({glyphCategories.punctuationSymbols.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {glyphCategories.punctuationSymbols.map((char, i) => (
                    <button
                      key={`sym-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Other Glyphs Section */}
            {(glyphFilter === 'all' || glyphFilter === 'other') && glyphCategories.otherGlyphs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Other Glyphs ({glyphCategories.otherGlyphs.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {glyphCategories.otherGlyphs.slice(0, 200).map((char, i) => (
                    <button
                      key={`other-${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-accent bg-accent-subtle text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-accent hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: cleanFontFamily,
                          fontWeight: selectedStyle.weight,
                          fontStyle: selectedStyle.style,
                        }}
                      >
                        {char}
                      </span>
                      <span className="text-[9px] font-mono text-[#666666] mt-0.5">
                        {char}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== STYLES TAB ==================== */}
        {activeTab === 'styles' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#282828]">
              <span className="text-xs text-[#888888]">
                Available weights and variants ({font.styles.length})
              </span>
            </div>

            <div className="space-y-3">
              {font.styles.map((style) => (
                <div
                  key={style.name}
                  className="bg-[#1e1e1e] rounded-md border border-[#2b2b2b] p-4 space-y-2 hover:border-[#383838] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">{style.name}</span>
                      <span className="text-[10px] text-[#888888] font-mono">
                        Weight: {style.weight} {style.style === 'italic' ? '• Italic' : ''}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{ backgroundColor: bgColor }}
                    className="p-3 rounded transition-colors select-text"
                  >
                    <p
                      className={`${alignClass} leading-tight`}
                      style={{
                        fontFamily: font.fontFamily,
                        color: textColor,
                        fontWeight: style.weight,
                        fontStyle: style.style,
                        fontSize: `${fontSize}px`,
                      }}
                    >
                      {previewText || font.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== WATERFALL TAB ==================== */}
        {activeTab === 'waterfall' && (
          <div className="space-y-4">
            <div className="pb-2 border-b border-[#282828]">
              <span className="text-xs text-[#888888]">
                Typography waterfall sizing hierarchy for {font.name} {selectedStyle.name}
              </span>
            </div>

            <div
              style={{ backgroundColor: bgColor }}
              className="p-6 rounded-lg border border-[#2d2d2d] space-y-6 transition-colors select-text"
            >
              {WATERFALL_SIZES.map((size) => (
                <div key={size} className="space-y-1">
                  <div className="flex items-center space-x-2 text-[10px] font-mono text-[#888888] select-none">
                    <span className="w-10">{size}px</span>
                    <div className="flex-1 h-px bg-[#888888]/20" />
                  </div>
                  <p
                    className={`${alignClass} leading-tight break-words`}
                    style={{
                      fontFamily: font.fontFamily,
                      color: textColor,
                      fontSize: `${size}px`,
                      fontWeight: selectedStyle.weight,
                      fontStyle: selectedStyle.style,
                    }}
                  >
                    {previewText || 'The quick brown fox jumps over the lazy dog.'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== DETAILS & LICENSE TAB ==================== */}
        {activeTab === 'details' && (
          <div className="max-w-3xl space-y-6 pb-12">
            <div className="bg-[#1e1e1e] rounded-lg border border-[#2d2d2d] p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white flex items-center justify-between">
                <span>Font Specifications</span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-[#252525] border border-[#383838] text-accent rounded">
                  .{font.format}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-[#888888] block text-[11px]">Font Family</span>
                  <span className="font-medium text-white">{font.name}</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[11px]">Designer / Foundry</span>
                  <span className="font-medium text-white">{font.designer || 'Independent / Google'}</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[11px]">PostScript Name</span>
                  <span className="font-mono text-[#cccccc]">{font.postScriptName || `${font.name.replace(/\s+/g, '')}-Regular`}</span>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#888888] block text-[11px]">FILTER TAG</span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#252525] text-accent">
                      {font.category || 'Untagged'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      'Sans Serif',
                      'Serif',
                      'Slab Serif',
                      'Display',
                      'Monospace',
                      'Handwriting',
                      'Pixel',
                    ].map((tag) => {
                      const isSelected =
                        font.category?.toLowerCase().replace(/[\s-_]/g, '') ===
                        tag.toLowerCase().replace(/[\s-_]/g, '');
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            onUpdateFont?.(font.id, {
                              category: isSelected ? '' : tag,
                            })
                          }
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                            isSelected
                              ? 'border-accent bg-accent text-white font-semibold shadow-xs'
                              : 'border-[#383838] bg-[#222222] text-[#aaaaaa] hover:text-white hover:bg-[#2c2c2c]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 inline mr-1 stroke-[3] text-white" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  {/* AUTO TAGS */}
                  <div className="pt-2 border-t border-[#262626]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#888888] block text-[11px]">AUTO TAGS</span>
                      <button
                        type="button"
                        onClick={() => {
                          const auto = autoTagFontMetadata({
                            fontName: font.name,
                            postScriptName: font.postScriptName,
                            fileName: font.fileName,
                            subfamily: font.styles?.[0]?.name,
                            weight: font.styles?.[0]?.weight,
                            isItalic: font.styles?.[0]?.style === 'italic',
                          });
                          onUpdateFont?.(font.id, {
                            tags: auto.tags,
                            category: auto.suggestedCategory || font.category,
                          });
                        }}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#252525] hover:bg-[#303030] text-[#cccccc] border border-[#383838] transition-colors"
                        title="Scan font metadata and automatically apply matching tags"
                      >
                        <span>Auto-scan Metadata</span>
                      </button>
                    </div>

                    {font.tags && font.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {font.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-accent-subtle text-accent border border-accent-subtle"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs italic text-[#777777]">
                        No system tags detected. Click Auto-scan to scan font metadata.
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-[#888888] block text-[11px]">Glyphs Count</span>
                  <span className="font-mono text-white">
                    {font.numGlyphs ? `${font.numGlyphs.toLocaleString()} glyphs` : '350+ glyphs'}
                  </span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[11px]">Styles Count</span>
                  <span className="font-medium text-white">{font.stylesCount} styles</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[11px]">File Source</span>
                  <span className="font-medium text-accent">
                    {font.provider === 'Local' ? 'Local File' : font.provider === 'System' ? 'System Font' : 'Google Fonts Library'}
                  </span>
                </div>
                {font.fileSize && (
                  <div>
                    <span className="text-[#888888] block text-[11px]">File Size</span>
                    <span className="font-mono text-white">{(font.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                )}
              </div>

              {font.fileName && (
                <div className="pt-2 border-t border-[#292929] text-[11px]">
                  <span className="text-[#888888] block mb-1">Local File Path:</span>
                  <code className="bg-[#141414] px-2 py-1 rounded text-[#777777] font-mono block truncate">
                    {font.filePath || font.fileName}
                  </code>
                </div>
              )}
            </div>

            <div className="bg-[#1e1e1e] rounded-lg border border-[#2d2d2d] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Licensing & Usage</h2>
                {font.provider === 'Google' && font.licenseUrl && (
                  <a
                    href={font.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    View Official License ↗
                  </a>
                )}
              </div>

              {font.provider === 'Local' ? (
                <div className="p-3 bg-[#1c1917] rounded border border-[#442c1d] text-center">
                  <span className="text-xs text-[#fbbf24] font-medium block">
                    License not verified for local fonts
                  </span>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#d4d4d4] leading-relaxed">
                    {font.license || 'Licensed under standard font terms.'}
                  </p>

                  {font.copyright && (
                    <div className="pt-2 border-t border-[#2a2a2a] text-[11px] text-[#888888]">
                      <span className="font-medium text-[#aaaaaa]">Copyright:</span> {font.copyright}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 bg-[#171717] rounded border border-[#292929] space-y-1">
                      <span className="text-xs font-semibold text-[#22c55e] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Commercial Usage Allowed
                      </span>
                      <p className="text-[11px] text-[#888888]">
                        Permitted in commercial client logos, websites, digital applications, and print materials.
                      </p>
                    </div>
                    <div className="p-3 bg-[#171717] rounded border border-[#292929] space-y-1">
                      <span className="text-xs font-semibold text-[#22c55e] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Personal Projects Allowed
                      </span>
                      <p className="text-[11px] text-[#888888]">
                        Permitted for personal non-commercial experiments, mockups, and desktop design.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
