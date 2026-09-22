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
  Download,
  RotateCcw,
  Sliders,
  Type,
  Sparkles,
  Palette,
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
  const [copiedPath, setCopiedPath] = useState(false);

  // Wordmark Studio State
  const [kernWord, setKernWord] = useState<string>(font.name.toUpperCase());
  const [kernOffsets, setKernOffsets] = useState<number[]>(() => new Array(font.name.length).fill(0));
  const [selectedLetterIdx, setSelectedLetterIdx] = useState<number>(0);
  const [shiftSelectedLetterIdx, setShiftSelectedLetterIdx] = useState<number | null>(null);
  const [globalTracking, setGlobalTracking] = useState<number>(0);
  const [kernFontSize, setKernFontSize] = useState<number>(72);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false);

  // Wordmark custom color states
  const [wordmarkTextColor, setWordmarkTextColor] = useState<string>(textColor || '#ffffff');
  const [wordmarkBgColor, setWordmarkBgColor] = useState<string>(bgColor || '#181818');
  const [showColorPopover, setShowColorPopover] = useState<boolean>(false);

  // Mouse Dragging State for letters
  const [dragState, setDragState] = useState<{ index: number; startX: number; initialOffset: number } | null>(null);

  // Update offsets length when word changes
  const handleWordChange = (newWord: string) => {
    setKernWord(newWord);
    setKernOffsets((prev) => {
      const next = new Array(newWord.length).fill(0);
      for (let i = 0; i < Math.min(prev.length, newWord.length); i++) {
        next[i] = prev[i];
      }
      return next;
    });
    if (selectedLetterIdx >= newWord.length) {
      setSelectedLetterIdx(Math.max(0, newWord.length - 1));
    }
    setShiftSelectedLetterIdx(null);
  };

  const updateSelectedOffset = (delta: number) => {
    setKernOffsets((prev) => {
      const next = [...prev];
      next[selectedLetterIdx] = (next[selectedLetterIdx] || 0) + delta;
      return next;
    });
  };

  const resetKerning = () => {
    setKernOffsets(new Array(kernWord.length).fill(0));
    setGlobalTracking(0);
    setShiftSelectedLetterIdx(null);
  };

  // Keyboard arrow keys for kerning adjustment & navigation in Wordmark Studio
  useEffect(() => {
    if (activeTab !== 'wordmark') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -5 : -1;
        setKernOffsets((prev) => {
          const next = [...prev];
          next[selectedLetterIdx] = (next[selectedLetterIdx] || 0) + delta;
          return next;
        });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 5 : 1;
        setKernOffsets((prev) => {
          const next = [...prev];
          next[selectedLetterIdx] = (next[selectedLetterIdx] || 0) + delta;
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedLetterIdx((prev) => Math.max(0, prev - 1));
        setShiftSelectedLetterIdx(null);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedLetterIdx((prev) => Math.min(kernWord.length - 1, prev + 1));
        setShiftSelectedLetterIdx(null);
      } else if (e.key === 'Escape') {
        setShiftSelectedLetterIdx(null);
        setShowColorPopover(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeTab, selectedLetterIdx, kernWord.length]);

  // Mouse drag handler for dragging letters horizontally
  const handleLetterMouseDown = (index: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift-click selects range or pair
      if (selectedLetterIdx !== index) {
        setShiftSelectedLetterIdx(index);
      } else {
        setShiftSelectedLetterIdx(null);
      }
      return;
    }

    setSelectedLetterIdx(index);
    setShiftSelectedLetterIdx(null);
    setDragState({
      index,
      startX: e.clientX,
      initialOffset: kernOffsets[index] || 0,
    });
  };

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (e: MouseEvent) => {
      const delta = Math.round((e.clientX - dragState.startX) * 0.85);
      setKernOffsets((prev) => {
        const next = [...prev];
        next[dragState.index] = dragState.initialOffset + delta;
        return next;
      });
    };

    const onMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState]);

  const cleanFontFamily = useMemo(() => {
    return font.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  }, [font.fontFamily]);

  // Robust Path Copy
  const copyPath = async (text: string) => {
    if (!text) return;
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.copyToClipboard) {
        await (window as any).electronAPI.copyToClipboard(text);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedPath(true);
      setTimeout(() => setCopiedPath(false), 2000);
    } catch (e) {
      console.warn('Clipboard copy error:', e);
      try {
        navigator.clipboard?.writeText(text);
        setCopiedPath(true);
        setTimeout(() => setCopiedPath(false), 2000);
      } catch {}
    }
  };

  // Generate completely valid, well-formed SVG without XML parsing errors, matching live canvas layout
  const buildSvgString = () => {
    const chars = Array.from(kernWord);
    const trackingPx = Number(globalTracking) || 0;
    const baseSize = Number(kernFontSize) || 72;
    const safeFamily = cleanFontFamily || 'sans-serif';
    const safeTextCol = wordmarkTextColor || textColor || '#ffffff';
    const safeBgCol = wordmarkBgColor || bgColor || '#181818';

    const escapeXml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    };

    let tspans = '';
    chars.forEach((c, idx) => {
      const offset = (kernOffsets[idx] || 0) + (idx > 0 ? trackingPx : 0);
      const textVal = c === ' ' ? '&#160;' : escapeXml(c);
      if (idx === 0) {
        tspans += `<tspan>${textVal}</tspan>`;
      } else {
        tspans += `<tspan dx="${offset}">${textVal}</tspan>`;
      }
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" width="1000" height="300">
  <rect width="1000" height="300" fill="${escapeXml(safeBgCol)}"/>
  <text x="500" y="165" dominant-baseline="middle" text-anchor="middle" font-family="${escapeXml(safeFamily)}, sans-serif" font-size="${baseSize}" font-weight="${selectedStyle.weight}" font-style="${selectedStyle.style}" fill="${escapeXml(safeTextCol)}">${tspans}</text>
</svg>`;
  };

  const handleExportSvg = () => {
    const svgContent = buildSvgString();
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(font.name || 'wordmark').toLowerCase().replace(/[^a-z0-9]/g, '-')}-wordmark.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySvg = async () => {
    const svgContent = buildSvgString();
    try {
      if (typeof window !== 'undefined' && (window as any).electronAPI?.copyToClipboard) {
        await (window as any).electronAPI.copyToClipboard(svgContent);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(svgContent);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = svgContent;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch {
      try {
        navigator.clipboard?.writeText(svgContent);
        setCopiedSvg(true);
        setTimeout(() => setCopiedSvg(false), 2000);
      } catch {}
    }
  };

  const showLicensing = font.provider !== 'Local' && font.provider !== 'System' && (Boolean(font.license) || Boolean(font.licenseUrl));

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
          onClick={() => setActiveTab('kern')}
          className={`py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'kern'
              ? 'border-accent text-accent'
              : isLight
              ? 'border-transparent text-[#64748b] hover:text-[#0f172a]'
              : 'border-transparent text-[#888888] hover:text-[#cccccc]'
          }`}
        >
          <span>Wordmark</span>
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
          <span>{showLicensing ? 'Details & License' : 'Font Details'}</span>
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

        {/* ==================== WORDMARK STUDIO TAB ==================== */}
        {activeTab === 'kern' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Top Toolbar / Wordmark Settings */}
            <div className={`p-4 rounded-xl border space-y-4 shadow-sm ${
              isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#1e1e1e] border-[#2c2c2c]'
            }`}>
              {/* Row 1: Text input, Case, Presets */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                {/* Word Input */}
                <div className="flex-1 w-full md:w-auto">
                  <label className={`text-[11px] font-semibold uppercase tracking-wider block mb-1.5 ${
                    isLight ? 'text-[#64748b]' : 'text-[#888888]'
                  }`}>
                    Wordmark Text
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={kernWord}
                      onChange={(e) => handleWordChange(e.target.value)}
                      placeholder="Type your wordmark..."
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border focus:outline-none focus:border-accent ${
                        isLight
                          ? 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1]'
                          : 'bg-[#161616] text-white border-[#333333]'
                      }`}
                    />
                    {/* Case converters */}
                    <button
                      type="button"
                      onClick={() => handleWordChange(kernWord.toUpperCase())}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        isLight
                          ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                          : 'bg-[#252525] hover:bg-[#303030] text-[#cccccc] border-[#383838]'
                      }`}
                      title="Convert to UPPERCASE"
                    >
                      AA
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWordChange(kernWord.toLowerCase())}
                      className={`px-2.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                        isLight
                          ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                          : 'bg-[#252525] hover:bg-[#303030] text-[#cccccc] border-[#383838]'
                      }`}
                      title="Convert to lowercase"
                    >
                      aa
                    </button>
                  </div>
                </div>

                {/* Preset Words */}
                <div className="w-full md:w-auto">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider block mb-1.5 ${
                    isLight ? 'text-[#64748b]' : 'text-[#888888]'
                  }`}>
                    Presets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {['FONTIER', 'AVALANCHE', 'TYPO', 'WARP', 'To', 'Wa', 'LT', 'VAV'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleWordChange(p)}
                        className={`px-2 py-1 rounded text-xs font-mono border transition-colors ${
                          kernWord === p
                            ? 'bg-accent text-white border-accent'
                            : isLight
                            ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]'
                            : 'bg-[#252525] hover:bg-[#303030] text-[#aaaaaa] border-[#333333]'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 2: Sliders, Weight, Guides, Colors Popover, and Reset */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-[#2a2a2a]/30">
                {/* Font Size */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={isLight ? 'text-[#64748b]' : 'text-[#888888]'}>Size</span>
                    <span className="font-mono text-accent font-semibold">{kernFontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="24"
                    max="140"
                    value={kernFontSize}
                    onChange={(e) => setKernFontSize(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#333333] rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

                {/* Global Tracking */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={isLight ? 'text-[#64748b]' : 'text-[#888888]'}>Tracking</span>
                    <span className="font-mono text-accent font-semibold">{globalTracking > 0 ? `+${globalTracking}` : globalTracking}px</span>
                  </div>
                  <input
                    type="range"
                    min="-20"
                    max="80"
                    value={globalTracking}
                    onChange={(e) => setGlobalTracking(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#333333] rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>

                {/* Weight / Style Variant */}
                <div className="space-y-1">
                  <span className={`text-xs block ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>Weight / Style</span>
                  <select
                    value={selectedStyle.name}
                    onChange={(e) => {
                      const s = font.styles.find((st) => st.name === e.target.value);
                      if (s) setSelectedStyle(s);
                    }}
                    className={`w-full text-xs font-medium py-1 px-2 rounded border focus:outline-none ${
                      isLight
                        ? 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1]'
                        : 'bg-[#181818] text-white border-[#333333]'
                    }`}
                  >
                    {font.styles.map((s) => (
                      <option key={s.name} value={s.name} className={isLight ? 'bg-white text-black' : 'bg-[#222222] text-white'}>
                        {s.name} ({s.weight})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Compact Toolbar Action Controls (Guides, Colors Popover, Reset) */}
                <div className="flex items-end space-x-1.5 relative">
                  <button
                    type="button"
                    onClick={() => setShowGuides((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors text-center ${
                      showGuides
                        ? 'bg-accent-subtle border-accent text-accent'
                        : isLight
                        ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#64748b]'
                        : 'bg-[#222222] border-[#333333] text-[#888888]'
                    }`}
                    title="Toggle typographic alignment guides"
                  >
                    {showGuides ? 'Guides: On' : 'Guides: Off'}
                  </button>

                  {/* Minimized Colors Button + Dropdown Popover */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowColorPopover((prev) => !prev)}
                      className={`px-2.5 py-1.5 rounded text-xs font-medium border transition-colors flex items-center space-x-1.5 ${
                        showColorPopover
                          ? 'bg-accent-subtle border-accent text-accent'
                          : isLight
                          ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                          : 'bg-[#222222] hover:bg-[#2a2a2a] text-[#cccccc] border-[#333333]'
                      }`}
                      title="Customize text and canvas colors"
                    >
                      <Palette className="w-3.5 h-3.5 text-accent" />
                      <span>Colors</span>
                      <div
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: wordmarkTextColor }}
                      />
                    </button>

                    {showColorPopover && (
                      <div className={`absolute right-0 top-full mt-2 z-50 p-3.5 rounded-xl shadow-2xl border w-72 space-y-3 animate-in fade-in zoom-in-95 duration-100 ${
                        isLight ? 'bg-white border-[#cbd5e1] text-[#1e293b]' : 'bg-[#1e1e1e] border-[#383838] text-[#e0e0e0]'
                      }`}>
                        {/* Text Color Selection */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold uppercase tracking-wider text-neutral-400">Text Color</span>
                            <span className="font-mono text-[10px] text-accent">{wordmarkTextColor}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {['#ffffff', '#38bdf8', '#22c55e', '#f59e0b', '#f43f5e', '#a855f7', '#000000'].map((c) => (
                              <button
                                key={`pop-txt-${c}`}
                                type="button"
                                onClick={() => setWordmarkTextColor(c)}
                                className={`w-5 h-5 rounded-full border transition-transform ${
                                  wordmarkTextColor.toLowerCase() === c.toLowerCase()
                                    ? 'ring-2 ring-accent scale-110'
                                    : 'opacity-80 hover:opacity-100 hover:scale-105 border-white/20'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <label className={`relative cursor-pointer px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center space-x-0.5 ${
                              isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#282828] border-[#3e3e3e]'
                            }`}>
                              <Palette className="w-2.5 h-2.5 text-accent" />
                              <input
                                type="color"
                                value={wordmarkTextColor}
                                onChange={(e) => setWordmarkTextColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </label>
                          </div>
                        </div>

                        {/* Background Color Selection */}
                        <div className="space-y-1.5 pt-2 border-t border-[#333333]/40">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-semibold uppercase tracking-wider text-neutral-400">Canvas Background</span>
                            <span className="font-mono text-[10px] text-accent">{wordmarkBgColor}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {['#181818', '#0d1117', '#000000', '#ffffff', '#f8fafc', '#1e293b'].map((c) => (
                              <button
                                key={`pop-bg-${c}`}
                                type="button"
                                onClick={() => setWordmarkBgColor(c)}
                                className={`w-5 h-5 rounded-full border transition-transform ${
                                  wordmarkBgColor.toLowerCase() === c.toLowerCase()
                                    ? 'ring-2 ring-accent scale-110'
                                    : 'opacity-80 hover:opacity-100 hover:scale-105 border-white/20'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <label className={`relative cursor-pointer px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center space-x-0.5 ${
                              isLight ? 'bg-[#f8fafc] border-[#cbd5e1]' : 'bg-[#282828] border-[#3e3e3e]'
                            }`}>
                              <Palette className="w-2.5 h-2.5 text-accent" />
                              <input
                                type="color"
                                value={wordmarkBgColor}
                                onChange={(e) => setWordmarkBgColor(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={resetKerning}
                    className={`p-2 rounded text-xs font-medium border transition-colors flex items-center justify-center ${
                      isLight
                        ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]'
                        : 'bg-[#222222] hover:bg-[#2a2a2a] text-[#aaaaaa] border-[#333333]'
                    }`}
                    title="Reset all kerning and tracking offsets"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Shift Distance Indicator: when two letters are selected */}
            {shiftSelectedLetterIdx !== null && selectedLetterIdx !== null && shiftSelectedLetterIdx !== selectedLetterIdx && (
              <div className="p-3 bg-accent/10 border border-accent/40 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-white">
                    Distance between &apos;{kernWord[Math.min(selectedLetterIdx, shiftSelectedLetterIdx)]}&apos; (#{Math.min(selectedLetterIdx, shiftSelectedLetterIdx) + 1}) and &apos;{kernWord[Math.max(selectedLetterIdx, shiftSelectedLetterIdx)]}&apos; (#{Math.max(selectedLetterIdx, shiftSelectedLetterIdx) + 1}):
                  </span>
                  <span className="font-mono text-accent font-bold">
                    {(() => {
                      const min = Math.min(selectedLetterIdx, shiftSelectedLetterIdx);
                      const max = Math.max(selectedLetterIdx, shiftSelectedLetterIdx);
                      let totalSpacing = 0;
                      for (let i = min + 1; i <= max; i++) {
                        totalSpacing += globalTracking + (kernOffsets[i] || 0);
                      }
                      return `${totalSpacing}px (across ${max - min} interval${max - min === 1 ? '' : 's'})`;
                    })()}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShiftSelectedLetterIdx(null)}
                  className="text-[11px] underline text-neutral-400 hover:text-white"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Interactive Kerning Canvas with Dragging and Spacing Lines */}
            <div
              style={{ backgroundColor: wordmarkBgColor }}
              className={`relative min-h-[280px] rounded-2xl border p-8 flex flex-col items-center justify-center overflow-x-auto shadow-inner select-none transition-colors ${
                dragState ? 'cursor-ew-resize' : 'cursor-default'
              } ${isLight ? 'border-[#e2e8f0]' : 'border-[#333333]'}`}
            >
              {/* Optional Typographic Guidelines */}
              {showGuides && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-center opacity-30">
                  <div className="w-full border-b border-dashed border-accent/60 mb-8" />
                  <div className="w-full border-b border-dashed border-accent/60 mt-8" />
                </div>
              )}

              {/* Characters container with interactive kerning handles & in-between dimension lines */}
              <div className="flex items-center justify-center relative z-10 py-6 px-4" style={{ overflow: 'visible' }}>
                {Array.from(kernWord).map((char, index) => {
                  const offset = kernOffsets[index] || 0;
                  const isSelected = selectedLetterIdx === index;
                  const isShiftSelected = shiftSelectedLetterIdx === index;
                  const isWithinSpan =
                    shiftSelectedLetterIdx !== null &&
                    index > Math.min(selectedLetterIdx, shiftSelectedLetterIdx) &&
                    index <= Math.max(selectedLetterIdx, shiftSelectedLetterIdx);

                  const isDraggingThis = dragState?.index === index;
                  const spacingPx = index > 0 ? globalTracking + offset : 0;
                  const showLeftDistance = selectedLetterIdx !== null && selectedLetterIdx === index && index > 0 && shiftSelectedLetterIdx === null;

                  return (
                    <React.Fragment key={`kern-frag-${index}-${char}`}>
                      {/* Spacing / Distance Indicator Line directly IN BETWEEN letters */}
                      {index > 0 && (
                        <div
                          className="flex items-center justify-center relative select-none shrink-0"
                          style={{
                            width: `${Math.max(14, spacingPx)}px`,
                            minWidth: `${Math.max(14, spacingPx)}px`,
                            height: `${kernFontSize}px`,
                          }}
                        >
                          {(showLeftDistance || isWithinSpan) ? (
                            <div className="w-full flex items-center justify-center relative px-0.5 z-20">
                              <div className="w-full border-b-2 border-dashed border-accent opacity-90" />
                              <span className="absolute px-1.5 py-0.5 bg-accent text-white font-mono text-[9px] font-bold rounded shadow-md whitespace-nowrap">
                                {spacingPx}px
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Letter Glyph Container */}
                      <div
                        className="relative flex flex-col items-center group cursor-grab active:cursor-grabbing select-none shrink-0"
                        style={{
                          zIndex: isDraggingThis ? 40 : isSelected ? 30 : 10,
                        }}
                        onMouseDown={(e) => handleLetterMouseDown(index, e)}
                      >
                        {/* Character Offset Pill / Drag Handle above */}
                        <div
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded mb-1 transition-all pointer-events-none ${
                            isDraggingThis
                              ? 'bg-accent text-white scale-110 shadow-md font-bold'
                              : isSelected || isShiftSelected
                              ? 'bg-accent text-white shadow-xs font-semibold'
                              : isWithinSpan
                              ? 'bg-accent/40 text-white'
                              : offset !== 0
                              ? 'bg-accent/20 text-accent'
                              : 'opacity-0 group-hover:opacity-80 bg-[#333333] text-[#aaaaaa]'
                          }`}
                        >
                          {isDraggingThis ? `${offset > 0 ? `+${offset}` : offset}px` : (offset > 0 ? `+${offset}` : offset !== 0 ? `${offset}` : `${index + 1}`)}
                        </div>

                        {/* Letter Glyph Box */}
                        <div
                          className={`px-1 py-0.5 rounded-lg transition-all ${
                            isDraggingThis
                              ? 'ring-2 ring-accent bg-accent/25 shadow-lg'
                              : isSelected || isShiftSelected
                              ? 'ring-2 ring-accent bg-accent/15'
                              : isWithinSpan
                              ? 'ring-1 ring-accent/60 bg-accent/10'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <span
                            style={{
                              fontFamily: cleanFontFamily,
                              color: wordmarkTextColor,
                              fontWeight: selectedStyle.weight,
                              fontStyle: selectedStyle.style,
                              fontSize: `${kernFontSize}px`,
                              lineHeight: 1,
                              display: 'inline-block',
                            }}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </span>
                        </div>

                        {/* Sub-index indicator */}
                        <span className={`text-[8px] font-mono mt-1 transition-opacity ${
                          isSelected || isShiftSelected || isWithinSpan ? 'text-accent font-bold opacity-100' : 'text-[#666666] opacity-30'
                        }`}>
                          #{index + 1}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Selected Letter Kerning Fine-Tuner */}
            {kernWord.length > 0 && (
              <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm ${
                isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#1e1e1e] border-[#2c2c2c]'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent flex items-center justify-center shrink-0">
                    <span
                      style={{
                        fontFamily: cleanFontFamily,
                        color: wordmarkTextColor,
                        fontWeight: selectedStyle.weight,
                        fontStyle: selectedStyle.style,
                        fontSize: '22px',
                        lineHeight: 1,
                      }}
                    >
                      {kernWord[selectedLetterIdx] || 'A'}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold text-xs ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                        Letter &apos;{kernWord[selectedLetterIdx]}&apos; (Position #{selectedLetterIdx + 1})
                      </span>
                      <span className="text-[11px] font-mono text-accent font-bold">
                        {(kernOffsets[selectedLetterIdx] || 0) > 0 ? `+${kernOffsets[selectedLetterIdx]}` : (kernOffsets[selectedLetterIdx] || 0)}px
                      </span>
                    </div>
                    <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                      Drag letter on canvas or use the position slider and numeric input below
                    </span>
                  </div>
                </div>

                {/* Slider + Number Input Controls */}
                <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                  <div className="flex items-center space-x-2 flex-1 md:flex-none">
                    <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>Offset:</span>
                    <input
                      type="range"
                      min="-120"
                      max="120"
                      value={kernOffsets[selectedLetterIdx] || 0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setKernOffsets((prev) => {
                          const next = [...prev];
                          next[selectedLetterIdx] = val;
                          return next;
                        });
                      }}
                      className="w-32 sm:w-44 h-1.5 bg-[#333333] rounded-lg appearance-none cursor-pointer accent-accent"
                    />
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min="-300"
                        max="300"
                        value={kernOffsets[selectedLetterIdx] || 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10) || 0;
                          setKernOffsets((prev) => {
                            const next = [...prev];
                            next[selectedLetterIdx] = val;
                            return next;
                          });
                        }}
                        className={`w-14 px-1.5 py-1 rounded text-xs font-mono text-center font-semibold border focus:outline-none focus:border-accent ${
                          isLight
                            ? 'bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1]'
                            : 'bg-[#181818] text-white border-[#383838]'
                        }`}
                      />
                      <span className={`text-[10px] font-mono ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>px</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setKernOffsets((prev) => {
                        const next = [...prev];
                        next[selectedLetterIdx] = 0;
                        return next;
                      });
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                      isLight
                        ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#64748b] border-[#cbd5e1]'
                        : 'bg-[#252525] hover:bg-[#303030] text-[#aaaaaa] border-[#383838]'
                    }`}
                    title="Reset offset for this letter to 0"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Export Bar */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#181818] border-[#2c2c2c]'
            }`}>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                  Export Wordmark
                </span>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopySvg}
                  className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-medium bg-accent hover:bg-accent/90 text-white transition-colors flex items-center justify-center space-x-1.5 shadow-sm"
                >
                  {copiedSvg ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>SVG Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy SVG</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleExportSvg}
                  className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center justify-center space-x-1.5 ${
                    isLight
                      ? 'bg-white hover:bg-[#f8fafc] text-[#0f172a] border-[#cbd5e1]'
                      : 'bg-[#222222] hover:bg-[#2b2b2b] text-white border-[#383838]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SVG</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== DETAILS & LICENSE TAB ==================== */}
        {activeTab === 'details' && (
          <div className="max-w-3xl space-y-6 pb-12">
            <div className={`rounded-lg border p-5 space-y-4 ${
              isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#1e1e1e] border-[#2d2d2d]'
            }`}>
              <h2 className={`text-sm font-semibold flex items-center justify-between ${
                isLight ? 'text-[#0f172a]' : 'text-white'
              }`}>
                <span>Font Specifications</span>
                <span className="text-[11px] font-mono px-2 py-0.5 bg-[#252525] border border-[#383838] text-accent rounded">
                  .{font.format}
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>Font Family</span>
                  <span className={`font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{font.name}</span>
                </div>
                <div>
                  <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>Designer / Foundry</span>
                  <span className={`font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{font.designer || 'Independent / Google'}</span>
                </div>
                <div>
                  <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>PostScript Name</span>
                  <span className="font-mono text-[#cccccc]">{font.postScriptName || `${font.name.replace(/\s+/g, '')}-Regular`}</span>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>CATEGORY TAG</span>
                    <span className="text-xs px-2 py-0.5 rounded font-medium bg-accent-subtle text-accent">
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
                              : isLight
                              ? 'border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] hover:bg-[#f1f5f9]'
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
                  <div className={`pt-2 border-t ${isLight ? 'border-[#e2e8f0]' : 'border-[#262626]'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>AUTO TAGS</span>
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
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          isLight
                            ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#334155] border-[#cbd5e1]'
                            : 'bg-[#252525] hover:bg-[#303030] text-[#cccccc] border-[#383838]'
                        }`}
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
                      <p className={`text-xs italic ${isLight ? 'text-[#94a3b8]' : 'text-[#777777]'}`}>
                        No system tags detected. Click Auto-scan to scan font metadata.
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>Glyphs Count</span>
                  <span className={`font-mono ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                    {font.numGlyphs ? `${font.numGlyphs.toLocaleString()} glyphs` : 'Standard charset'}
                  </span>
                </div>
                <div>
                  <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>Styles Count</span>
                  <span className={`font-medium ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{font.stylesCount} styles</span>
                </div>
                <div>
                  <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>File Source</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (font.filePath || font.fileName) {
                        navigator.clipboard?.writeText(font.filePath || font.fileName);
                        setCopiedPath(true);
                        setTimeout(() => setCopiedPath(false), 2000);
                      }
                    }}
                    className="font-medium text-accent hover:underline flex items-center space-x-1"
                    title="Click to copy file location"
                  >
                    <span>
                      {font.provider === 'Local' ? 'Local File' : font.provider === 'System' ? 'System Font' : 'Google Fonts Library'}
                    </span>
                    {copiedPath ? (
                      <span className="text-green-400 font-semibold text-[9px]">Copied!</span>
                    ) : (
                      <Copy className="w-2.5 h-2.5 opacity-60" />
                    )}
                  </button>
                </div>
                {font.fileSize && (
                  <div>
                    <span className={`block text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>File Size</span>
                    <span className={`font-mono ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>{(font.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                )}
              </div>

              {font.fileName && (
                <div className={`pt-2 border-t text-[11px] ${isLight ? 'border-[#e2e8f0]' : 'border-[#292929]'}`}>
                  <span className={`block mb-1 ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>Local File Path:</span>
                  <code
                    onClick={() => {
                      navigator.clipboard?.writeText(font.filePath || font.fileName || '');
                      setCopiedPath(true);
                      setTimeout(() => setCopiedPath(false), 2000);
                    }}
                    className="bg-[#141414] px-2 py-1 rounded text-[#777777] hover:text-white cursor-pointer font-mono block truncate transition-colors"
                    title="Click to copy path"
                  >
                    {font.filePath || font.fileName}
                  </code>
                </div>
              )}
            </div>

            {/* Licensing block only for Google / Verified Web Fonts */}
            {showLicensing && (
              <div className={`rounded-lg border p-5 space-y-3 ${
                isLight ? 'bg-white border-[#e2e8f0]' : 'bg-[#1e1e1e] border-[#2d2d2d]'
              }`}>
                <div className="flex items-center justify-between">
                  <h2 className={`text-sm font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>Licensing & Usage</h2>
                  {font.licenseUrl && (
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

                <p className={`text-xs leading-relaxed ${isLight ? 'text-[#475569]' : 'text-[#d4d4d4]'}`}>
                  {font.license || 'Licensed under standard font terms.'}
                </p>

                {font.copyright && (
                  <div className={`pt-2 border-t text-[11px] ${isLight ? 'border-[#e2e8f0] text-[#64748b]' : 'border-[#2a2a2a] text-[#888888]'}`}>
                    <span className={`font-medium ${isLight ? 'text-[#334155]' : 'text-[#aaaaaa]'}`}>Copyright:</span> {font.copyright}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className={`p-3 rounded border space-y-1 ${
                    isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#171717] border-[#292929]'
                  }`}>
                    <span className="text-xs font-semibold text-[#22c55e] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Commercial Usage Allowed
                    </span>
                    <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                      Permitted in commercial client logos, websites, digital applications, and print materials.
                    </p>
                  </div>
                  <div className={`p-3 rounded border space-y-1 ${
                    isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#171717] border-[#292929]'
                  }`}>
                    <span className="text-xs font-semibold text-[#22c55e] flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Personal Projects Allowed
                    </span>
                    <p className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                      Permitted for personal non-commercial experiments, mockups, and desktop design.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
