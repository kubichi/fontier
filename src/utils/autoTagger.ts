import { FontCategory } from '../types';

export interface FontMetadataInput {
  fontName?: string;
  subfamily?: string;
  postScriptName?: string;
  fileName?: string;
  weight?: number;
  isItalic?: boolean;
  parsedFont?: any; // opentype.js Font instance
}

export interface AutoTagResult {
  tags: string[];
  suggestedCategory?: FontCategory;
}

/**
 * Auto-tagging utility that scans font metadata (like 'italic', 'bold', 'mono')
 * from OpenType tables, PostScript names, subfamilies, and filenames,
 * and automatically applies matching system tags and categories.
 */
export function autoTagFontMetadata(input: FontMetadataInput): AutoTagResult {
  const tags = new Set<string>();
  let suggestedCategory: FontCategory | undefined;

  const fontName = (input.fontName || '').toLowerCase();
  const subfamily = (input.subfamily || '').toLowerCase();
  const postScriptName = (input.postScriptName || '').toLowerCase();
  const fileName = (input.fileName || '').toLowerCase();

  // Combined string target for text matching
  const combined = `${fontName} ${subfamily} ${postScriptName} ${fileName}`;

  // 1. Inspect OpenType tables if available
  const os2 = input.parsedFont?.tables?.os2;
  const post = input.parsedFont?.tables?.post;
  const head = input.parsedFont?.tables?.head;

  const fsSelection = os2?.fsSelection || 0;
  const usWeightClass = os2?.usWeightClass || input.weight || 400;
  const macStyle = head?.macStyle || 0;
  const isFixedPitch = post?.isFixedPitch || 0;
  const italicAngle = post?.italicAngle || 0;

  // --- MONO DETECTION ---
  const isMonoTable = isFixedPitch !== 0;
  const isMonoName =
    /\b(mono|monospace|code|typewriter|console|terminal|fixed|courier|menlo|consolas)\b/i.test(
      combined
    ) ||
    combined.includes('mono') ||
    combined.includes('code');

  if (isMonoTable || isMonoName) {
    tags.add('Mono');
    suggestedCategory = 'Monospace';
  }

  // --- ITALIC / OBLIQUE DETECTION ---
  const isItalicTable =
    Boolean(fsSelection & 1) || // OS/2 fsSelection bit 0
    Boolean(fsSelection & 512) || // OS/2 fsSelection bit 9 (Oblique)
    Boolean(macStyle & 2) || // head macStyle bit 1
    (italicAngle !== 0 && italicAngle !== undefined);

  const isItalicName =
    /\b(italic|oblique|slanted|ital|kursiv)\b/i.test(combined) ||
    input.isItalic === true;

  if (isItalicTable || isItalicName) {
    tags.add('Italic');
  }

  // --- BOLD / HEAVY DETECTION ---
  const isBoldTable =
    Boolean(fsSelection & 32) || // OS/2 fsSelection bit 5 (Bold)
    Boolean(macStyle & 1) || // head macStyle bit 0 (Bold)
    usWeightClass >= 600;

  const isBoldName =
    /\b(bold|black|heavy|extrabold|semibold|semi-bold|ultra|fat|700|800|900)\b/i.test(
      combined
    );

  if (isBoldTable || isBoldName) {
    tags.add('Bold');
  }

  // --- LIGHT / THIN DETECTION ---
  const isLightTable = usWeightClass <= 300 && usWeightClass > 0;
  const isLightName = /\b(light|thin|hairline|extralight|ultra-light|100|200|300)\b/i.test(
    combined
  );

  if (isLightTable || isLightName) {
    tags.add('Light');
  }

  // --- CONDENSED DETECTION ---
  const isCondensedTable = Boolean(macStyle & 32);
  const isCondensedName = /\b(condensed|narrow|compressed|cn)\b/i.test(combined);

  if (isCondensedTable || isCondensedName) {
    tags.add('Condensed');
  }

  // --- CLASSIFICATION CATEGORY & TAGS ---
  // Slab Serif
  if (/\b(slab|egyptian|rockwell|clarendon|roque)\b/i.test(combined)) {
    tags.add('Slab Serif');
    if (!suggestedCategory || suggestedCategory === 'Sans Serif') {
      suggestedCategory = 'Slab Serif';
    }
  }
  // Pixel / 8-bit
  else if (/\b(pixel|bitmap|8bit|arcade|retro|matrix|dot)\b/i.test(combined)) {
    tags.add('Pixel');
    if (!suggestedCategory) suggestedCategory = 'Pixel';
  }
  // Handwriting / Script / Calligraphy
  else if (
    /\b(script|hand|handwriting|calligraphy|brush|signature|cursive|doodle|pen|marker)\b/i.test(
      combined
    )
  ) {
    tags.add('Handwriting');
    if (!suggestedCategory) suggestedCategory = 'Handwriting';
  }
  // Display / Decorative
  else if (
    /\b(display|titling|headline|poster|decorative|stencil|banner|gothic-display)\b/i.test(
      combined
    )
  ) {
    tags.add('Display');
    if (!suggestedCategory) suggestedCategory = 'Display';
  }
  // Serif (ensure it does not match 'sans serif')
  else if (
    (/\b(serif|roman|garamond|times|caslon|bodoni|baskerville|georgia|didot|palatino|minion)\b/i.test(
      combined
    ) &&
      !/sans/i.test(combined)) ||
    (os2?.sFamilyClass && (os2.sFamilyClass >> 8 >= 1 && os2.sFamilyClass >> 8 <= 7))
  ) {
    tags.add('Serif');
    if (!suggestedCategory) suggestedCategory = 'Serif';
  }
  // Sans Serif
  else if (
    /\b(sans|grotesk|grotesque|gothic|helvetica|arial|inter|roboto|sf|segoe)\b/i.test(
      combined
    ) ||
    (os2?.sFamilyClass && os2.sFamilyClass >> 8 === 8)
  ) {
    tags.add('Sans Serif');
    if (!suggestedCategory) suggestedCategory = 'Sans Serif';
  }

  // If no category was suggested, default to Sans Serif
  if (!suggestedCategory) {
    suggestedCategory = 'Sans Serif';
  }

  return {
    tags: Array.from(tags),
    suggestedCategory,
  };
}
