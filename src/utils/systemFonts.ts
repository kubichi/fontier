import { FontItem, FontCategory } from '../types';

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
  { name: 'Segoe UI', category: 'Sans Serif', tags: ['Sans Serif', 'Windows 11', 'Fluent', 'UI'] },
  { name: 'Segoe UI Variable', category: 'Sans Serif', tags: ['Sans Serif', 'Windows 11', 'Variable'] },
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
 * Optimized to handle 8,000+ fonts smoothly in batches without blocking the UI.
 */
export async function detectWindowsSystemFonts(
  onBatchProgress?: (loaded: number, total: number) => void
): Promise<FontItem[]> {
  const result: FontItem[] = [];
  const discoveredNames = new Set<string>();

  // 1. Try modern Chromium/Electron Local Font Access API
  if (typeof window !== 'undefined' && 'queryLocalFonts' in window) {
    try {
      const localFonts: any[] = await (window as any).queryLocalFonts();
      const total = localFonts.length;
      
      // Process in micro-tasks to keep UI running at 60 FPS even with 8,000+ fonts
      const BATCH = 300;
      for (let i = 0; i < total; i += BATCH) {
        const slice = localFonts.slice(i, i + BATCH);
        for (const f of slice) {
          if (!discoveredNames.has(f.family)) {
            discoveredNames.add(f.family);
            const cat = quickCategorize(f.family);
            result.push({
              id: `system-${f.family.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
              name: f.family,
              fontFamily: `"${f.family}", sans-serif`,
              format: 'TTF',
              category: cat,
              tags: ['Windows System', 'Installed', cat],
              stylesCount: 1,
              styles: [{ name: f.style || 'Regular', weight: 400, style: 'normal' }],
              active: true,
              favorite: false,
              provider: 'System',
              designer: 'Windows System Foundry',
              version: 'Windows System Font',
              license: 'Standard Microsoft Windows OS Font License',
            });
          }
        }
        if (onBatchProgress && total > 500) {
          onBatchProgress(Math.min(i + BATCH, total), total);
          // Yield to main thread
          await new Promise((r) => setTimeout(r, 0));
        }
      }
    } catch {
      // Fallback to catalog if local font access permission not granted
    }
  }

  // 2. Add verified Windows System Fonts from catalog if not already added
  for (const def of COMMON_WINDOWS_FONTS) {
    if (!discoveredNames.has(def.name) && isFontAvailable(def.name)) {
      discoveredNames.add(def.name);
      result.push({
        id: `system-${def.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: def.name,
        fontFamily: `"${def.name}", sans-serif`,
        format: 'TTF',
        category: def.category,
        tags: ['Windows System', ...def.tags],
        stylesCount: 1,
        styles: [{ name: 'Regular', weight: 400, style: 'normal' }],
        active: true,
        favorite: false,
        provider: 'System',
        designer: 'Microsoft Typography',
        version: 'Windows System Font',
        license: 'Standard Microsoft Windows OS Font License',
      });
    }
  }

  return result;
}
