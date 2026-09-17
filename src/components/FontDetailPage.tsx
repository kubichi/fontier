import React, { useState } from 'react';
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
} from 'lucide-react';
import { FontItem, DetailTab, TextAlignment, FontStyle } from '../types';
import { autoTagFontMetadata } from '../utils/autoTagger';

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

const UPPERCASE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWERCASE_ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const NUMBERS = '0123456789'.split('');
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~\\'.split('');
const EXTENDED_LATIN = 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ'.split('');

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
  const [glyphFilter, setGlyphFilter] = useState<'all' | 'upper' | 'lower' | 'numbers' | 'symbols' | 'extended'>('all');

  const alignClass =
    alignment === 'center'
      ? 'text-center'
      : alignment === 'right'
      ? 'text-right'
      : 'text-left';

  const copyCharacter = (char: string) => {
    navigator.clipboard.writeText(char);
    setCopiedGlyph(true);
    setTimeout(() => setCopiedGlyph(false), 1500);
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
                    ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a] border-[#cbd5e1] focus:border-[#16a34a]'
                    : 'bg-[#242424] hover:bg-[#2b2b2b] text-[#e0e0e0] border-[#383838] focus:border-[#4ade80]'
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
              ? isLight
                ? 'border-[#16a34a] text-[#16a34a]'
                : 'border-[#4ade80] text-white'
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
              ? isLight
                ? 'border-[#16a34a] text-[#16a34a]'
                : 'border-[#4ade80] text-white'
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
              ? isLight
                ? 'border-[#16a34a] text-[#16a34a]'
                : 'border-[#4ade80] text-white'
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
              ? isLight
                ? 'border-[#16a34a] text-[#16a34a]'
                : 'border-[#4ade80] text-white'
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
                      fontFamily: font.fontFamily,
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
                    <span>Unicode: <strong className="text-[#4ade80]">{getUnicodeHex(selectedGlyph)}</strong></span>
                    <span>HTML: <strong className="text-[#60a5fa]">{getHtmlEntity(selectedGlyph)}</strong></span>
                  </div>
                  <p className="text-xs text-[#999999] pt-1">
                    Rendered in {font.name} {selectedStyle.name}
                  </p>
                </div>
              </div>

              {/* Live interactive sentence preview */}
              <div className="w-full md:w-auto flex-1 max-w-md bg-[#181818] p-3 rounded border border-[#2b2b2b]">
                <span className="text-[10px] uppercase font-semibold text-[#777777] block mb-1">
                  Alphabet Pangram Preview
                </span>
                <p
                  className="text-base text-[#e0e0e0] leading-snug"
                  style={{
                    fontFamily: font.fontFamily,
                    fontWeight: selectedStyle.weight,
                    fontStyle: selectedStyle.style,
                  }}
                >
                  The quick brown fox jumps over the lazy dog. 0123456789
                </p>
              </div>
            </div>

            {/* Filter buttons for Glyphs */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#888888] font-medium mr-1">Filter:</span>
              {(
                [
                  ['all', 'All Characters'],
                  ['upper', 'Uppercase (A-Z)'],
                  ['lower', 'Lowercase (a-z)'],
                  ['numbers', 'Numbers (0-9)'],
                  ['symbols', 'Symbols & Marks'],
                  ['extended', 'Accents & Latin Ext.'],
                ] as const
              ).map(([fKey, label]) => (
                <button
                  key={fKey}
                  onClick={() => setGlyphFilter(fKey)}
                  className={`px-2.5 py-1 rounded-full border text-xs transition-colors ${
                    glyphFilter === fKey
                      ? 'bg-[#2b2b2b] border-[#4ade80] text-white font-medium'
                      : 'border-[#333333] text-[#888888] hover:border-[#555555] hover:text-[#cccccc]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Uppercase Alphabet Section */}
            {(glyphFilter === 'all' || glyphFilter === 'upper') && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Uppercase Alphabet ({UPPERCASE_ALPHABET.length})
                </h3>
                <div className="grid grid-cols-8 sm:grid-cols-13 gap-2">
                  {UPPERCASE_ALPHABET.map((char) => (
                    <button
                      key={char}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-[#4ade80] bg-[#223326] text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-[#4ade80]/60 hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-2xl"
                        style={{
                          fontFamily: font.fontFamily,
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
            {(glyphFilter === 'all' || glyphFilter === 'lower') && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Lowercase Alphabet ({LOWERCASE_ALPHABET.length})
                </h3>
                <div className="grid grid-cols-8 sm:grid-cols-13 gap-2">
                  {LOWERCASE_ALPHABET.map((char) => (
                    <button
                      key={char}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-[#4ade80] bg-[#223326] text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-[#4ade80]/60 hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-2xl"
                        style={{
                          fontFamily: font.fontFamily,
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
            {(glyphFilter === 'all' || glyphFilter === 'numbers') && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Numerals (0-9)
                </h3>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {NUMBERS.map((char) => (
                    <button
                      key={char}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-[#4ade80] bg-[#223326] text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-[#4ade80]/60 hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-2xl"
                        style={{
                          fontFamily: font.fontFamily,
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

            {/* Symbols Section */}
            {(glyphFilter === 'all' || glyphFilter === 'symbols') && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Symbols & Punctuation ({SYMBOLS.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {SYMBOLS.map((char, i) => (
                    <button
                      key={`${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-[#4ade80] bg-[#223326] text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-[#4ade80]/60 hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: font.fontFamily,
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

            {/* Extended Latin & Accents Section */}
            {(glyphFilter === 'all' || glyphFilter === 'extended') && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#888888]">
                  Accents & Latin Extended ({EXTENDED_LATIN.length})
                </h3>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {EXTENDED_LATIN.map((char, i) => (
                    <button
                      key={`${char}-${i}`}
                      onClick={() => setSelectedGlyph(char)}
                      className={`aspect-square rounded-md border flex flex-col items-center justify-center transition-all ${
                        selectedGlyph === char
                          ? 'border-[#4ade80] bg-[#223326] text-white shadow-md scale-105'
                          : 'border-[#2e2e2e] bg-[#1d1d1d] text-[#e0e0e0] hover:border-[#4ade80]/60 hover:bg-[#252525]'
                      }`}
                    >
                      <span
                        className="text-xl"
                        style={{
                          fontFamily: font.fontFamily,
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
                <span className="text-[11px] font-mono px-2 py-0.5 bg-[#252525] border border-[#383838] text-[#4ade80] rounded">
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
                  <span className="text-[#888888] block text-[11px]">Version Number</span>
                  <span className="font-mono text-[#f59e0b] font-medium">{font.version || 'Version 1.000'}</span>
                </div>
                <div>
                  <span className="text-[#888888] block text-[11px]">PostScript Name</span>
                  <span className="font-mono text-[#cccccc]">{font.postScriptName || `${font.name.replace(/\s+/g, '')}-Regular`}</span>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[#888888] block text-[11px]">Filter Tag / Classification</span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-[#252525] text-[#4ade80]">
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
                              ? 'border-[#4ade80] bg-[#22c55e] text-black font-semibold shadow-xs'
                              : 'border-[#383838] bg-[#222222] text-[#aaaaaa] hover:text-white hover:bg-[#2c2c2c]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 inline mr-1 stroke-[3]" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  {/* System Tags (Auto-detected) */}
                  <div className="pt-2 border-t border-[#262626]">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#888888] block text-[11px]">System Tags (Auto-detected)</span>
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
                            className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#172b1e] text-[#4ade80] border border-[#225032]"
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
                  <span className="font-medium text-[#38bdf8]">
                    {font.provider === 'Local' ? 'Local System Folder' : 'Google Fonts Library'}
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
                {font.licenseUrl && (
                  <a
                    href={font.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#60a5fa] hover:underline"
                  >
                    View Official License ↗
                  </a>
                )}
              </div>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
