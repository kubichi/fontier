import opentype from 'opentype.js';
import { FontItem, FontFormat, FontCategory } from '../types';
import { autoTagFontMetadata } from './autoTagger';
import { saveFontBinary, registerFontFace } from './fontStorage';

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

export async function parseFontFile(
  file: File,
  folderId?: string
): Promise<FontItem> {
  const ext = (file.name.split('.').pop()?.toUpperCase() || 'TTF') as FontFormat;
  const arrayBuffer = await file.arrayBuffer();

  const fileBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
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
      
      familyGroup = typographicFamily || familyName || extractFamilyGroup(fullName || fontName, file.name);
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
    }
  } catch (err) {
    console.warn('Could not parse OpenType tables with opentype.js; falling back to basic binary loading:', err);
  }

  if (!familyGroup) {
    familyGroup = extractFamilyGroup(fontName, file.name);
  }

  // Scan font metadata (italic, bold, mono, serif, etc.) and apply matching system tags
  const autoTagResult = autoTagFontMetadata({
    fontName,
    subfamily,
    postScriptName,
    fileName: file.name,
    weight: subfamily.toLowerCase().includes('bold') ? 700 : 400,
    isItalic: subfamily.toLowerCase().includes('italic'),
  });

  category = autoTagResult.suggestedCategory || category;

  // Generate unique CSS font-family name to avoid collision across 2,000+ fonts
  const uniqueId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const safeFontFamily = `UserFont_${uniqueId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Register FontFace in browser immediately
  await registerFontFace(safeFontFamily, arrayBuffer);

  // Persist font binary into IndexedDB asynchronously for permanent reload persistence
  saveFontBinary(uniqueId, safeFontFamily, arrayBuffer).catch((e) => {
    console.warn('Could not save font to IndexedDB:', e);
  });

  return {
    id: uniqueId,
    name: fontName,
    fontFamily: `"${safeFontFamily}", sans-serif`,
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
    fileSize: file.size,
    fileName: file.name,
    filePath: (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name,
    unitsPerEm,
    isCustomUploaded: true,
  };
}
