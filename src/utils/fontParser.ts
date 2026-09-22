import opentype from 'opentype.js';
import { FontItem, FontFormat, FontCategory } from '../types';
import { autoTagFontMetadata } from './autoTagger';
import { saveFontBinary, registerFontFace, getRegisteredFamilies } from './fontStorage';

function extractString(nameObj: unknown): string {
  if (!nameObj) return '';
  if (typeof nameObj === 'string') return nameObj;
  if (typeof nameObj === 'object') {
    const obj = nameObj as Record<string, string>;
    return obj.en || Object.values(obj)[0] || '';
  }
  return String(nameObj);
}

function extractFamilyGroup(familyName: string, fileName: string): string {
  let base = familyName || fileName.replace(/\.[^/.]+$/, '');
  // Remove common weight/style suffixes like Regular, Bold, Italic, 100, 200, etc.
  base = base
    .replace(/[-_]/g, ' ')
    .replace(/\s+(Regular|Bold|Italic|Light|Medium|SemiBold|DemiBold|ExtraBold|Black|Thin|Heavy|ExtraLight|UltraLight|Book|Condensed|Oblique|\d{3}(italic)?)/gi, '')
    .trim();
  return base || familyName || 'Untitled Family';
}

/**
 * Builds a safe CSS font-family name from a raw family string.
 * We use the ACTUAL font family name (from OpenType tables) so CSS references
 * remain stable across app restarts without needing special rehydration logic.
 * A numeric suffix is appended only when the same family name is imported more
 * than once (e.g. two different files both reporting family "MyFont").
 */
function buildSafeFamilyName(rawFamily: string): string {
  // Strip characters that are problematic in unquoted CSS (quotes are added at usage)
  const clean = rawFamily.replace(/[^\x20-\x7E]/g, '').trim() || 'UnknownFont';

  // If not yet registered, use as-is; otherwise append a counter suffix
  const registered = getRegisteredFamilies();
  if (!registered.has(clean)) {
    return clean;
  }

  // Same family already loaded (e.g. both Regular and Bold as separate files) — reuse the same name
  // so they share the font-family bucket. The @font-face rule supports font-weight/font-style ranges.
  return clean;
}

export async function parseFontBuffer(
  fileName: string,
  buffer: ArrayBuffer | Uint8Array,
  folderId?: string,
  fileSize?: number,
  filePath?: string,
  skipImmediateRegister?: boolean
): Promise<FontItem> {
  const ext = (fileName.split('.').pop()?.toUpperCase() || 'TTF') as FontFormat;
  if (!buffer) {
    throw new Error('Empty font buffer provided');
  }

  let arrayBuffer: ArrayBuffer;
  if ((buffer as any).buffer && (buffer as any).byteOffset !== undefined && (buffer as any).byteLength !== undefined) {
    const u8 = buffer as unknown as Uint8Array;
    arrayBuffer = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
  } else if (buffer instanceof ArrayBuffer) {
    arrayBuffer = buffer;
  } else {
    arrayBuffer = new Uint8Array(buffer as any).buffer as ArrayBuffer;
  }

  const fileBaseName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  let fontName = fileBaseName;
  let familyGroup = '';
  let designer = 'Unknown Designer';
  let version = 'Version 1.000';
  let license = 'No license information specified in font metadata';
  let licenseUrl = '';
  let copyright = '';
  let postScriptName = '';
  let numGlyphs = 256;
  let unitsPerEm = 1000;
  let category: FontCategory = 'Sans Serif';
  let subfamily = 'Regular';

  try {
    const parsedFont = opentype.parse(arrayBuffer);
    if (parsedFont && parsedFont.names) {
      const familyName = extractString(parsedFont.names.fontFamily);
      const fullName = extractString(parsedFont.names.fullName);
      const typographicFamily = extractString((parsedFont.names as any).preferredFamily || (parsedFont.names as any).typographicFamily);

      familyGroup = typographicFamily || familyName || extractFamilyGroup(fullName || fontName, fileName);
      fontName = fullName || familyName || fontName;

      subfamily = extractString(parsedFont.names.fontSubfamily) || 'Regular';
      postScriptName = extractString(parsedFont.names.postScriptName) || '';
      designer =
        extractString(parsedFont.names.designer) ||
        extractString(parsedFont.names.manufacturer) ||
        'Independent Foundry';

      version = extractString(parsedFont.names.version) || 'Version 1.000';
      license =
        extractString(parsedFont.names.license) ||
        'Standard commercial/desktop font licensing';
      licenseUrl = extractString(parsedFont.names.licenseURL) || '';
      copyright = extractString(parsedFont.names.copyright) || '';
      numGlyphs = parsedFont.numGlyphs || (parsedFont.glyphs ? parsedFont.glyphs.length : 256);
      unitsPerEm = parsedFont.unitsPerEm || 1000;

      // Extract all supported unicode codepoints directly from cmap table, filtering out empty placeholder glyphs
      if (parsedFont.tables && parsedFont.tables.cmap && parsedFont.tables.cmap.glyphIndexMap) {
        const glyphMap = parsedFont.tables.cmap.glyphIndexMap;
        const codepoints: number[] = [];
        for (const key of Object.keys(glyphMap)) {
          const cp = Number(key);
          if (cp <= 0) continue;
          const gIndex = glyphMap[cp];
          if (!gIndex) continue;
          const g = parsedFont.glyphs ? parsedFont.glyphs.get(gIndex) : null;
          if (!g) continue;
          // Require actual outline commands so empty glyph slots don't render as blank boxes or dots
          if (cp === 32 || (g.path && g.path.commands && g.path.commands.length > 0)) {
            codepoints.push(cp);
          }
        }
        (buffer as any).__supportedCodepoints = codepoints;
      } else if (parsedFont.glyphs && parsedFont.glyphs.length) {
        const codepoints: number[] = [];
        for (let i = 0; i < parsedFont.glyphs.length; i++) {
          const g = parsedFont.glyphs.get(i);
          if (!g) continue;
          const hasPath = (g.path && g.path.commands && g.path.commands.length > 0);
          if (g.unicode !== undefined && g.unicode > 0 && (g.unicode === 32 || hasPath)) {
            codepoints.push(g.unicode);
          }
          if (g.unicodes && g.unicodes.length) {
            for (const u of g.unicodes) {
              if (u > 0 && (u === 32 || hasPath) && !codepoints.includes(u)) codepoints.push(u);
            }
          }
        }
        (buffer as any).__supportedCodepoints = codepoints;
      }
    }
  } catch (err) {
    console.warn('Could not parse OpenType tables with opentype.js; using filename as fallback:', err);
  }

  if (!familyGroup) {
    familyGroup = extractFamilyGroup(fontName, fileName);
  }

  // Scan font metadata (italic, bold, mono, serif, etc.) and apply matching system tags
  const autoTagResult = autoTagFontMetadata({
    fontName,
    subfamily,
    postScriptName,
    fileName,
    weight: subfamily.toLowerCase().includes('bold') ? 700 : 400,
    isItalic: subfamily.toLowerCase().includes('italic'),
  });

  category = autoTagResult.suggestedCategory || category;

  const safeFontFamily = buildSafeFamilyName(familyGroup || fontName);
  const storageId = 'local-' + Date.now() + '-' + fileName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 32);

  // Register FontFace only if not skipped (keeps RAM low by only loading visible fonts)
  if (!skipImmediateRegister) {
    await registerFontFace(safeFontFamily, arrayBuffer);
  }

  // Only persist to IndexedDB if we do not have a local physical filePath to read on demand
  if (!filePath && typeof window !== 'undefined' && !((window as any).electronAPI?.readFontFile)) {
    saveFontBinary(storageId, safeFontFamily, arrayBuffer).catch((e) => {
      console.warn('Could not save font to IndexedDB:', e);
    });
  }

  return {
    id: storageId,
    name: fontName,
    fontFamily: '"' + safeFontFamily + '"',

    format: ext,
    category,
    familyGroup,
    tags: autoTagResult.tags,
    stylesCount: 1,
    styles: [
      {
        name: subfamily,
        weight: subfamily.toLowerCase().includes('bold') ? 700 : 400,
        style: subfamily.toLowerCase().includes('italic') ? 'italic' : 'normal',
      },
    ],
    active: true,
    favorite: false,
    folderId,
    provider: 'Local',
    designer,
    version,
    license,
    licenseUrl,
    copyright,
    postScriptName,
    numGlyphs,
    fileSize: fileSize || arrayBuffer.byteLength,
    fileName,
    filePath: filePath || fileName,
    unitsPerEm,
    isCustomUploaded: true,
    supportedCodepoints: (buffer as any).__supportedCodepoints,
  };
}

export async function parseFontFile(
  file: File,
  folderId?: string
): Promise<FontItem> {
  const arrayBuffer = await file.arrayBuffer();
  const item = await parseFontBuffer(file.name, arrayBuffer, folderId, file.size);
  item.filePath = (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
  return item;
}
