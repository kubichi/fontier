import { FontItem, FontCategory, FontStyle } from '../types';

interface WindowsFontDef {
  name: string;
  category: FontCategory;
  tags: string[];
}

const COMMON_WINDOWS_FONTS: WindowsFontDef[] = [
  { name: 'Arial', category: 'Sans Serif', tags: ['Sans Serif', 'Universal', 'Standard'] },
  { name: 'Calibri', category: 'Sans Serif', tags: ['Sans Serif', 'Office', 'Modern'] },
  { name: 'Cambria', category: 'Serif', tags: ['Serif', 'Office', 'Editorial'] },
  { name: 'Candara', category: 'Sans Serif', tags: ['Sans Serif', 'Fluent', 'Clean'] },
  { name: 'Comic Sans MS', category: 'Handwriting', tags: ['Handwriting', 'Casual', 'Display'] },
  { name: 'Consolas', category: 'Monospace', tags: ['Monospace', 'Code', 'Terminal'] },
  { name: 'Constantia', category: 'Serif', tags: ['Serif', 'Book', 'Elegant'] },
  { name: 'Corbel', category: 'Sans Serif', tags: ['Sans Serif', 'Modern', 'Clean'] },
  { name: 'Courier New', category: 'Monospace', tags: ['Monospace', 'Typewriter', 'Retro'] },
  { name: 'Franklin Gothic Medium', category: 'Sans Serif', tags: ['Sans Serif', 'Headline', 'Bold'] },
  { name: 'Gabriola', category: 'Display', tags: ['Display', 'Calligraphic', 'Decorative'] },
  { name: 'Georgia', category: 'Serif', tags: ['Serif', 'Web', 'Editorial'] },
  { name: 'Impact', category: 'Display', tags: ['Display', 'Bold', 'Poster', 'Heavy'] },
  { name: 'Lucida Console', category: 'Monospace', tags: ['Monospace', 'System', 'Terminal'] },
  { name: 'Lucida Sans Unicode', category: 'Sans Serif', tags: ['Sans Serif', 'Universal', 'Clean'] },
  { name: 'Malgun Gothic', category: 'Sans Serif', tags: ['Sans Serif', 'East Asian', 'Clean'] },
  { name: 'Microsoft Sans Serif', category: 'Sans Serif', tags: ['Sans Serif', 'Legacy', 'System'] },
  { name: 'Palatino Linotype', category: 'Serif', tags: ['Serif', 'Classical', 'Book'] },
  { name: 'Segoe UI', category: 'Sans Serif', tags: ['Sans Serif', 'Fluent', 'UI'] },
  { name: 'Segoe UI Variable', category: 'Sans Serif', tags: ['Sans Serif', 'Variable'] },
  { name: 'Segoe UI Emoji', category: 'Display', tags: ['Display', 'Emoji', 'Color'] },
  { name: 'Segoe UI Symbol', category: 'Display', tags: ['Display', 'Icon', 'Symbols'] },
  { name: 'SimSun', category: 'Serif', tags: ['Serif', 'CJK', 'Standard'] },
  { name: 'Sitka', category: 'Serif', tags: ['Serif', 'Optical', 'Reading'] },
  { name: 'Sylfaen', category: 'Serif', tags: ['Serif', 'Multilingual', 'Classical'] },
  { name: 'Tahoma', category: 'Sans Serif', tags: ['Sans Serif', 'UI', 'Compact'] },
  { name: 'Times New Roman', category: 'Serif', tags: ['Serif', 'Academic', 'Document'] },
  { name: 'Trebuchet MS', category: 'Sans Serif', tags: ['Sans Serif', 'Web', 'Humanist'] },
  { name: 'Verdana', category: 'Sans Serif', tags: ['Sans Serif', 'Legible', 'Screen'] },
  { name: 'Yu Gothic', category: 'Sans Serif', tags: ['Sans Serif', 'Japanese', 'Clean'] },
];

// Shared canvas context to avoid DOM allocations when verifying fonts
let sharedCanvasCtx: CanvasRenderingContext2D | null = null;
function getCanvasContext(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!sharedCanvasCtx) {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    sharedCanvasCtx = canvas.getContext('2d', { willReadFrequently: false });
  }
  return sharedCanvasCtx;
}

/**
 * Checks whether a given font name is installed and rendered by the OS.
 */
function isFontAvailable(fontName: string): boolean {
  if (typeof document === 'undefined') return true;
  if (document.fonts && document.fonts.check(`16px "${fontName}"`)) {
    return true;
  }

  try {
    const ctx = getCanvasContext();
    if (!ctx) return true;

    const testString = 'mmmmmmmmmmlli!@#$%^&*()_+';
    ctx.font = '72px monospace';
    const baseMono = ctx.measureText(testString).width;
    ctx.font = '72px sans-serif';
    const baseSans = ctx.measureText(testString).width;

    ctx.font = `72px "${fontName}", monospace`;
    const monoTested = ctx.measureText(testString).width;
    ctx.font = `72px "${fontName}", sans-serif`;
    const sansTested = ctx.measureText(testString).width;

    return monoTested !== baseMono || sansTested !== baseSans;
  } catch {
    return true;
  }
}

function quickCategorize(name: string): FontCategory {
  const n = name.toLowerCase();
  if (n.includes('mono') || n.includes('code') || n.includes('console') || n.includes('typewriter') || n.includes('terminal')) {
    return 'Monospace';
  }
  if (n.includes('serif') && !n.includes('sans')) {
    return 'Serif';
  }
  if (n.includes('script') || n.includes('hand') || n.includes('brush') || n.includes('calligraph')) {
    return 'Handwriting';
  }
  if (n.includes('display') || n.includes('black') || n.includes('poster') || n.includes('gothic') || n.includes('impact') || n.includes('emoji') || n.includes('symbol')) {
    return 'Display';
  }
  return 'Sans Serif';
}

/**
 * Discovers installed Windows system fonts.
 * Groups 8,000+ local font files into structured typeface families with full style variant counts.
 */
export async function detectWindowsSystemFonts(
  onBatchProgress?: (loaded: number, total: number) => void
): Promise<FontItem[]> {
  const result: FontItem[] = [];
  const discoveredNames = new Set<string>();

  // 1. Modern Chromium/Electron Local Font Access API
  if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
    try {
      const localFonts: any[] = await (window as any).queryLocalFonts();
      const total = localFonts.length;

      const familyMap = new Map<
        string,
        {
          family: string;
          fullName: string;
          postscriptNames: string[];
          styles: FontStyle[];
        }
      >();

      // Group all font files / faces into typeface families
      for (const f of localFonts) {
        const fam = f.family || f.fullName;
        if (!fam) continue;

        let entry = familyMap.get(fam);
        if (!entry) {
          entry = {
            family: fam,
            fullName: f.fullName || fam,
            postscriptNames: [],
            styles: [],
          };
          familyMap.set(fam, entry);
        }

        if (f.postscriptName && !entry.postscriptNames.includes(f.postscriptName)) {
          entry.postscriptNames.push(f.postscriptName);
        }

        const styleName = f.style || 'Regular';
        const sLower = styleName.toLowerCase();
        const isItalic = sLower.includes('italic') || sLower.includes('oblique');
        const isBold = sLower.includes('bold') || sLower.includes('black') || sLower.includes('heavy');
        const isLight = sLower.includes('light') || sLower.includes('thin') || sLower.includes('hairline');
        const isSemiBold = sLower.includes('semi') || sLower.includes('demi') || sLower.includes('medium');
        const weight = isLight ? 300 : isSemiBold ? 600 : isBold ? 700 : 400;

        if (!entry.styles.some((s) => s.name.toLowerCase() === styleName.toLowerCase())) {
          entry.styles.push({
            name: styleName,
            weight,
            style: isItalic ? 'italic' : 'normal',
          });
        }
      }

      // Convert grouped families into FontItems
      let processed = 0;
      for (const [familyName, data] of familyMap.entries()) {
        discoveredNames.add(familyName);
        const cat = quickCategorize(familyName);
        
        result.push({
          id: `system-${familyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: familyName,
          fontFamily: `"${familyName}"`,
          format: 'TTF',
          category: cat,
          tags: ['System Font', 'Installed', cat, `${data.styles.length} styles`],
          stylesCount: Math.max(1, data.styles.length),
          styles: data.styles.length > 0 ? data.styles : [{ name: 'Regular', weight: 400, style: 'normal' }],
          active: true,
          favorite: false,
          provider: 'System',
          designer: 'System Typography',
          version: `${data.styles.length} styles (${total} font files indexed)`,
          license: 'Standard OS System Font License',
          postScriptName: data.postscriptNames[0] || '',
        });

        processed += data.styles.length;
        if (onBatchProgress && processed % 500 === 0) {
          onBatchProgress(Math.min(processed, total), total);
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } catch {
      // Fallback to catalog if local font access permission not granted
    }
  }

  // 2. Add verified System Fonts from catalog if not already added
  for (const def of COMMON_WINDOWS_FONTS) {
    if (!discoveredNames.has(def.name) && isFontAvailable(def.name)) {
      discoveredNames.add(def.name);
      result.push({
        id: `system-${def.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: def.name,
        fontFamily: `"${def.name}", sans-serif`,
        format: 'TTF',
        category: def.category,
        tags: ['System Font', ...def.tags],
        stylesCount: 1,
        styles: [{ name: 'Regular', weight: 400, style: 'normal' }],
        active: true,
        favorite: false,
        provider: 'System',
        designer: 'System Typography',
        version: 'System Font',
        license: 'Standard OS System Font License',
      });
    }
  }

  return result;
}
