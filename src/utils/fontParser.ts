import opentype from 'opentype.js';
import { FontItem, FontFormat, FontCategory } from '../types';
import { autoTagFontMetadata } from './autoTagger';

function extractString(nameObj: unknown): string {
  if (!nameObj) return '';
  if (typeof nameObj === 'string') return nameObj;
  if (typeof nameObj === 'object') {
    const obj = nameObj as Record<string, string>;
    return obj.en || Object.values(obj)[0] || '';
  }
  return String(nameObj);
}

export async function parseFontFile(
  file: File,
  folderId?: string
): Promise<FontItem> {
  const ext = (file.name.split('.').pop()?.toUpperCase() || 'TTF') as FontFormat;
  const arrayBuffer = await file.arrayBuffer();

  let fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
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
      fontName = familyName || fullName || fontName;

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

  // Generate unique CSS font-family name to avoid collision
  const safeFontFamily = `UserFont_${Date.now()}_${fontName.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Register in browser document.fonts via FontFace
  try {
    const fontFace = new FontFace(safeFontFamily, arrayBuffer);
    await fontFace.load();
    document.fonts.add(fontFace);
  } catch (loadErr) {
    console.warn('Failed to load FontFace directly:', loadErr);
  }

  return {
    id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    name: fontName,
    fontFamily: `"${safeFontFamily}", sans-serif`,
    format: ext,
    category,
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
