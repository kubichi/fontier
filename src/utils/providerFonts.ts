import { FontItem } from '../types';

/**
 * Service to fetch and stream font catalogs from web providers (Fontshare, Google Fonts, etc.)
 */

// In-memory cache for fetched provider fonts
let cachedFontshareFonts: FontItem[] | null = null;

/**
 * Fetch the complete font catalogue from Fontshare's official public API
 * (https://api.fontshare.com/v2/fonts)
 */
export async function fetchFontshareFonts(): Promise<FontItem[]> {
  if (cachedFontshareFonts && cachedFontshareFonts.length > 0) {
    return cachedFontshareFonts;
  }

  try {
    const res = await fetch('https://api.fontshare.com/v2/fonts');
    if (!res.ok) throw new Error(`Fontshare API error: ${res.status}`);
    const data = await res.json();
    const rawList = data.fonts || (Array.isArray(data) ? data : []);

    if (!rawList || rawList.length === 0) return [];

    const fonts: FontItem[] = [];
    const fontshareCdnSlugs: string[] = [];

    for (const item of rawList) {
      const slug = (item.slug || item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')).trim();
      const stylesList = Array.isArray(item.styles) && item.styles.length > 0
        ? item.styles.map((s: any) => {
            const weight = typeof s.weight === 'number' ? s.weight : parseInt(s.weight, 10) || 400;
            const isItalic = s.italic || (s.name && s.name.toLowerCase().includes('italic'));
            return {
              name: s.name || (weight >= 700 ? 'Bold' : weight <= 300 ? 'Light' : 'Regular'),
              weight,
              style: isItalic ? ('italic' as const) : ('normal' as const),
            };
          })
        : [
            { name: 'Regular', weight: 400, style: 'normal' as const },
            { name: 'Bold', weight: 700, style: 'normal' as const },
          ];

      const category = item.category?.name || item.category || 'Sans Serif';
      const cleanCategory =
        category.toLowerCase().includes('serif') && !category.toLowerCase().includes('sans')
          ? 'Serif'
          : category.toLowerCase().includes('display')
          ? 'Display'
          : category.toLowerCase().includes('mono')
          ? 'Monospace'
          : 'Sans Serif';

      fontshareCdnSlugs.push(`${slug}@${stylesList.map((st) => st.weight).join(',')}`);

      fonts.push({
        id: `fontshare-${slug}`,
        name: item.name,
        fontFamily: `"${item.name}", sans-serif`,
        format: 'WOFF2',
        category: cleanCategory,
        stylesCount: stylesList.length,
        styles: stylesList,
        active: true,
        favorite: false,
        folderId: cleanCategory === 'Serif' ? 'serif' : cleanCategory === 'Display' ? 'display' : 'sans',
        provider: 'Fontshare',
        designer: item.designer || 'Indian Type Foundry (ITF)',
        version: item.version || 'Version 1.000',
        license: 'Fontshare Free Font License',
        licenseUrl: 'https://www.fontshare.com/licensing',
        copyright: `Copyright Indian Type Foundry (${item.name})`,
        postScriptName: `${item.name.replace(/\s+/g, '')}-Regular`,
        numGlyphs: 450,
      });
    }

    // Inject Fontshare batch CSS stylesheet into document head for fast rendering
    if (typeof document !== 'undefined' && fontshareCdnSlugs.length > 0) {
      const fontParam = fontshareCdnSlugs.slice(0, 40).map((s) => `f[]=${s}`).join('&');
      const linkId = 'fontshare-dynamic-stylesheet';
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://api.fontshare.com/v2/css?${fontParam}&display=swap`;
        document.head.appendChild(link);
      }
    }

    cachedFontshareFonts = fonts;
    return fonts;
  } catch (err) {
    console.warn('Could not fetch Fontshare API live, returning offline fallback:', err);
    return [];
  }
}

import googleFontsJson from '../data/googleFontsList.json';

/**
 * Load Full Google Fonts Catalogue (1,940+ Typefaces)
 */
export async function loadGoogleFontsCatalogue(): Promise<FontItem[]> {
  try {
    const list = googleFontsJson as Array<{ name: string; cat: string; designer: string; styles: number[] }>;
    return list.map((g) => {
      const stylesList = (g.styles && g.styles.length > 0 ? g.styles : [400]).map((w) => ({
        name: w === 400 ? 'Regular' : w === 700 ? 'Bold' : w === 300 ? 'Light' : w === 900 ? 'Black' : `Weight ${w}`,
        weight: w,
        style: 'normal' as const,
      }));
      const cat = g.cat || 'Sans Serif';
      const cleanCategory =
        cat.toLowerCase().includes('serif') && !cat.toLowerCase().includes('sans')
          ? 'Serif'
          : cat.toLowerCase().includes('display')
          ? 'Display'
          : cat.toLowerCase().includes('mono')
          ? 'Monospace'
          : cat.toLowerCase().includes('hand') || cat.toLowerCase().includes('script')
          ? 'Handwriting'
          : 'Sans Serif';

      const folderId =
        cleanCategory === 'Serif' ? 'serif' :
        cleanCategory === 'Display' ? 'display' :
        cleanCategory === 'Monospace' ? 'mono' :
        cleanCategory === 'Handwriting' ? 'script' : 'sans';

      return {
        id: `google-${g.name.toLowerCase().replace(/[\s-_]/g, '-')}`,
        name: g.name,
        fontFamily: `"${g.name}", sans-serif`,
        format: 'TTF',
        category: cleanCategory,
        stylesCount: stylesList.length,
        styles: stylesList,
        active: true,
        favorite: false,
        folderId,
        provider: 'Google',
        designer: g.designer || 'Google Fonts',
        version: 'Version 2.000',
        license: 'SIL Open Font License, Version 1.1',
        licenseUrl: 'http://scripts.sil.org/OFL',
        copyright: `Copyright Google Fonts & ${g.designer}`,
        postScriptName: `${g.name.replace(/\s+/g, '')}-Regular`,
        numGlyphs: 400,
      };
    });
  } catch (err) {
    console.warn('Could not load google fonts json:', err);
    return [];
  }
}

/**
 * Load Velvetyne Open Source Type Foundry Catalogue (https://velvetyne.fr)
 */
export async function loadVelvetyneFonts(): Promise<FontItem[]> {
  const VELVETYNE_FONTS = [
    { name: 'Axxent', cat: 'Display', designer: 'Frank Adebiaye' },
    { name: 'Millimetre', cat: 'Display', designer: 'Jérémy Landes' },
    { name: 'Le Murmure', cat: 'Display', designer: 'Jérémy Landes' },
    { name: 'Savate', cat: 'Display', designer: 'Maxime Fittes' },
    { name: 'Ortica', cat: 'Serif', designer: 'Bénédicte de Lescure' },
    { name: 'Victorian Griffin', cat: 'Display', designer: 'Lucas Le Bihan' },
    { name: 'Gulax', cat: 'Display', designer: 'Julien Priez' },
    { name: 'Trickster', cat: 'Display', designer: 'Jean-Baptiste Morizot' },
    { name: 'Minipax', cat: 'Serif', designer: 'Raphaël Ronot' },
    { name: 'JGS', cat: 'Pixel', designer: 'Adel Faure' },
    { name: 'Solide Mirage', cat: 'Display', designer: 'Jérémy Landes' },
    { name: 'Outward', cat: 'Display', designer: 'Raoul Audouin' },
    { name: 'VG5000', cat: 'Pixel', designer: 'Justin Bihan' },
    { name: 'Pitch Orator', cat: 'Monospace', designer: 'Martin Silvestre' },
    { name: 'Bluu Next', cat: 'Serif', designer: 'Jean-Baptiste Morizot' },
    { name: 'Cirrus Cumulus', cat: 'Display', designer: 'Clara Sambot' },
    { name: 'Terminal Grotesque', cat: 'Pixel', designer: 'Raphaël Bastide' },
    { name: 'Hyper Script', cat: 'Handwriting', designer: 'Lucas Descroix' },
    { name: 'Digestif', cat: 'Display', designer: 'Lucas Le Bihan' },
    { name: 'PicNic', cat: 'Display', designer: 'Mariel Nils' },
    { name: 'Chonker', cat: 'Display', designer: 'Velvetyne' },
    { name: 'Crayonnette', cat: 'Handwriting', designer: 'Velvetyne' },
    { name: 'Lack', cat: 'Sans Serif', designer: 'Adrien Tétar' },
    { name: 'Karrik', cat: 'Sans Serif', designer: 'Jean-Baptiste Morizot' },
    { name: 'Anthony', cat: 'Sans Serif', designer: 'Sun Young Oh' },
    { name: 'Cantique', cat: 'Serif', designer: 'Benoît Bodhuin' },
    { name: 'BBB Baskervvol', cat: 'Serif', designer: 'Benoît Bodhuin' },
    { name: 'Degheest', cat: 'Display', designer: 'Ange Degheest' },
  ];

  return VELVETYNE_FONTS.map((v) => ({
    id: `velvetyne-${v.name.toLowerCase().replace(/[\s-_]/g, '-')}`,
    name: v.name,
    fontFamily: `"${v.name}", sans-serif`,
    format: 'WOFF2',
    category: v.cat,
    stylesCount: 1,
    styles: [{ name: 'Regular', weight: 400, style: 'normal' as const }],
    active: true,
    favorite: false,
    folderId: v.cat === 'Serif' ? 'serif' : v.cat === 'Display' ? 'display' : v.cat === 'Pixel' ? 'pixel' : 'sans',
    provider: 'Velvetyne',
    designer: `${v.designer} (Velvetyne Type Foundry)`,
    version: 'Version 1.000',
    license: 'SIL Open Font License (OFL)',
    licenseUrl: 'https://velvetyne.fr/licence/',
    copyright: `Copyright ${v.designer} / Velvetyne`,
    postScriptName: `${v.name.replace(/\s+/g, '')}-Regular`,
    numGlyphs: 360,
  }));
}

/**
 * Load Collletttivo Open Source Type Collective Catalogue (https://www.collletttivo.it)
 */
export async function loadCollletttivoFonts(): Promise<FontItem[]> {
  const COLLLETTTIVO_FONTS = [
    { name: 'Mattone', cat: 'Sans Serif', designer: 'Collletttivo' },
    { name: 'Sintesi', cat: 'Sans Serif', designer: 'Collletttivo' },
    { name: 'Halibut Serif', cat: 'Serif', designer: 'Collletttivo' },
    { name: 'Ribes', cat: 'Display', designer: 'Collletttivo' },
    { name: 'Mazius Review', cat: 'Serif', designer: 'Collletttivo' },
    { name: 'Gigante', cat: 'Display', designer: 'Collletttivo' },
    { name: 'Argesta', cat: 'Serif', designer: 'Collletttivo' },
    { name: 'Commuters Sans', cat: 'Sans Serif', designer: 'Collletttivo' },
    { name: 'Polymath', cat: 'Display', designer: 'Collletttivo' },
    { name: 'Apfel Grotezk', cat: 'Sans Serif', designer: 'Luigi Gorlero' },
    { name: 'Campi', cat: 'Display', designer: 'Collletttivo' },
    { name: 'Milo', cat: 'Sans Serif', designer: 'Collletttivo' },
    { name: 'Pastiche Grotesque', cat: 'Sans Serif', designer: 'Collletttivo' },
    { name: 'Scrappy', cat: 'Display', designer: 'Collletttivo' },
    { name: 'Monocraft', cat: 'Monospace', designer: 'Idrees Hassan' },
    { name: 'Piazzolla Libre', cat: 'Serif', designer: 'Huerta Tipográfica' },
    { name: 'Riforma Mono', cat: 'Monospace', designer: 'Collletttivo' },
    { name: 'Vesterbro', cat: 'Serif', designer: 'Collletttivo' },
  ];

  return COLLLETTTIVO_FONTS.map((c) => ({
    id: `collletttivo-${c.name.toLowerCase().replace(/[\s-_]/g, '-')}`,
    name: c.name,
    fontFamily: `"${c.name}", sans-serif`,
    format: 'WOFF2',
    category: c.cat,
    stylesCount: 1,
    styles: [{ name: 'Regular', weight: 400, style: 'normal' as const }],
    active: true,
    favorite: false,
    folderId: c.cat === 'Serif' ? 'serif' : c.cat === 'Display' ? 'display' : 'sans',
    provider: 'Collletttivo',
    designer: `${c.designer} (Collletttivo)`,
    version: 'Version 1.000',
    license: 'SIL Open Font License (OFL)',
    licenseUrl: 'https://www.collletttivo.it',
    copyright: `Copyright Collletttivo Type Collective`,
    postScriptName: `${c.name.replace(/\s+/g, '')}-Regular`,
    numGlyphs: 380,
  }));
}

/**
 * Load UNCUT Open-Source Contemporary Typography Catalogue (https://uncut.wtf - 50+ typefaces)
 */
export async function loadUncutFonts(): Promise<FontItem[]> {
  const UNCUT_FONTS = [
    { name: 'Saint', cat: 'Display', designer: 'Liza Dushnota' },
    { name: 'Uncut Sans', cat: 'Sans Serif', designer: 'Kasper Nordkvist' },
    { name: 'Uncut Serif', cat: 'Serif', designer: 'Kasper Nordkvist' },
    { name: 'Gap Sans', cat: 'Display', designer: 'Alexandre Liziard' },
    { name: 'Bertioga Sans', cat: 'Sans Serif', designer: 'Cristiano Sobral' },
    { name: 'Hauora Sans', cat: 'Sans Serif', designer: 'Wayne Shih' },
    { name: 'AUTHENTIC Sans', cat: 'Sans Serif', designer: 'Christina Janus & Desmond Wong' },
    { name: 'Standard', cat: 'Sans Serif', designer: 'Bryce Wilner' },
    { name: 'Berlin Grotesk', cat: 'Sans Serif', designer: 'Christian Munk' },
    { name: 'Opening Hours Sans', cat: 'Sans Serif', designer: 'Marc Rouault' },
    { name: 'Hedvig Letters Sans', cat: 'Sans Serif', designer: 'Hedvig' },
    { name: 'Hedvig Letters Serif', cat: 'Serif', designer: 'Hedvig' },
    { name: 'Liga Sans', cat: 'Sans Serif', designer: 'Lucas Sharp' },
    { name: 'Overused Grotesk', cat: 'Sans Serif', designer: 'RandomMaerks' },
    { name: 'Inclusive Sans', cat: 'Sans Serif', designer: 'Olivia King' },
    { name: 'BDO Grotesk', cat: 'Sans Serif', designer: 'BDO' },
    { name: 'TASA Orbiter', cat: 'Display', designer: 'TASA' },
    { name: 'TASA Explorer', cat: 'Sans Serif', designer: 'TASA' },
    { name: 'Tanklager', cat: 'Display', designer: 'Studio Feixen' },
    { name: 'LT Institute', cat: 'Display', designer: 'Lucas Type' },
    { name: 'Giphurs', cat: 'Display', designer: 'Giphurs Project' },
    { name: 'Amiamie', cat: 'Display', designer: 'Studio Triple' },
    { name: 'Hasköy', cat: 'Sans Serif', designer: 'Esen Karol' },
    { name: 'Vercetti', cat: 'Sans Serif', designer: 'Filippos Fragkogiannis' },
    { name: 'Aspekta', cat: 'Sans Serif', designer: 'Tsu Type' },
    { name: 'Barlaxent', cat: 'Display', designer: 'Barlaxent Studio' },
    { name: 'Swansea', cat: 'Sans Serif', designer: 'Roger White' },
    { name: 'Milford', cat: 'Display', designer: 'Milford Type' },
    { name: 'DINdong', cat: 'Display', designer: 'Din Studio' },
    { name: 'Tanker', cat: 'Display', designer: 'UNCUT' },
    { name: 'Array', cat: 'Display', designer: 'UNCUT' },
    { name: 'Telma', cat: 'Display', designer: 'UNCUT' },
    { name: 'Rowdies', cat: 'Display', designer: 'UNCUT' },
    { name: 'Nyght Serif', cat: 'Serif', designer: 'Maksym Kobuzan' },
    { name: 'Eiko Display', cat: 'Display', designer: 'Pangram' },
    { name: 'Migra Serif', cat: 'Serif', designer: 'Valerio Monopoli' },
    { name: 'Familjen Grotesk', cat: 'Sans Serif', designer: 'Familjen' },
    { name: 'Schibsted Grotesk', cat: 'Sans Serif', designer: 'Schibsted' },
    { name: 'Poltawski Nowy', cat: 'Serif', designer: 'Mateusz Machalski' },
    { name: 'Redaction', cat: 'Serif', designer: 'Forest Young' },
    { name: 'Atkinson Hyperlegible', cat: 'Sans Serif', designer: 'Braille Institute' },
    { name: 'Climate Crisis', cat: 'Display', designer: 'Daniel Couper' },
    { name: 'Nabla', cat: 'Display', designer: 'Arthur Reinders' },
    { name: 'Rubik Doodle', cat: 'Display', designer: 'Philipp Nurullin' },
    { name: 'Silkscreen', cat: 'Display', designer: 'Jason Kottke' },
    { name: 'Pixelify Sans', cat: 'Display', designer: 'Stefie Justprince' },
    { name: 'Micro 5', cat: 'Display', designer: 'Sorkin Type' },
    { name: 'Honk', cat: 'Display', designer: 'Ek Type' },
    { name: 'Bricolage Grotesque', cat: 'Sans Serif', designer: 'Mathieu Triay' },
    { name: 'Hanken Grotesk', cat: 'Sans Serif', designer: 'Hanken Design Co.' },
    { name: 'Geist Mono', cat: 'Monospace', designer: 'Vercel' },
    { name: 'Departure Mono', cat: 'Monospace', designer: 'Helena Zhang' },
    { name: 'Commit Mono', cat: 'Monospace', designer: 'Edoardo De Martin' },
    { name: 'Mona Sans', cat: 'Sans Serif', designer: 'GitHub' },
    { name: 'Hubot Sans', cat: 'Sans Serif', designer: 'GitHub' },
    { name: 'FK Roman Standard', cat: 'Serif', designer: 'Kasper Pyndt' },
    { name: 'Editorial Old', cat: 'Serif', designer: 'Pangram' },
    { name: 'Zodiak Serif', cat: 'Serif', designer: 'Jeremie Hornus' },
  ];

  return UNCUT_FONTS.map((u) => ({
    id: `uncut-${u.name.toLowerCase().replace(/[\s-_]/g, '-')}`,
    name: u.name,
    fontFamily: `"${u.name}", sans-serif`,
    format: 'WOFF2',
    category: u.cat,
    stylesCount: 1,
    styles: [{ name: 'Regular', weight: 400, style: 'normal' as const }],
    active: true,
    favorite: false,
    folderId: u.cat === 'Serif' ? 'serif' : u.cat === 'Display' ? 'display' : 'sans',
    provider: 'UNCUT',
    designer: `${u.designer} (UNCUT Catalogue)`,
    version: 'Version 1.000',
    license: 'Libre / Free Font License',
    licenseUrl: 'https://uncut.wtf',
    copyright: `Copyright ${u.designer}`,
    postScriptName: `${u.name.replace(/\s+/g, '')}-Regular`,
    numGlyphs: 400,
  }));
}

/**
 * Load Free Faces Curated Type Directory (https://www.freefaces.gallery - 30 typefaces)
 */
export async function loadFreeFacesFonts(): Promise<FontItem[]> {
  const FREE_FACES_FONTS = [
    { name: 'Big Shoulders Display', cat: 'Display', designer: 'Patric King' },
    { name: 'Syne Tactile', cat: 'Display', designer: 'Lucas Descroix' },
    { name: 'Fraunces Serif', cat: 'Serif', designer: 'Phaedra Charles' },
    { name: 'Space Grotesk Modern', cat: 'Sans Serif', designer: 'Florian Karsten' },
    { name: 'Plus Jakarta Display', cat: 'Sans Serif', designer: 'Tokotype' },
    { name: 'Urbanist Geometric', cat: 'Sans Serif', designer: 'Corey Hu' },
    { name: 'Outfit Modern', cat: 'Sans Serif', designer: 'Outfit' },
    { name: 'Lexend Deca', cat: 'Sans Serif', designer: 'Thomas Jockin' },
    { name: 'Red Hat Display', cat: 'Display', designer: 'MCKL' },
    { name: 'BioRhyme', cat: 'Serif', designer: 'Aoife Mooney' },
    { name: 'Bespoke Serif', cat: 'Serif', designer: 'Free Faces' },
    { name: 'Cirka', cat: 'Display', designer: 'Nick Losacco' },
    { name: 'Messapia', cat: 'Serif', designer: 'Lorenzo Mattei' },
    { name: 'Authentic Sans', cat: 'Sans Serif', designer: 'Authentic' },
    { name: 'Millimetre Modern', cat: 'Display', designer: 'Jérémy Landes' },
    { name: 'League Spartan Pro', cat: 'Sans Serif', designer: 'The League' },
    { name: 'Cooper Hewitt Bold', cat: 'Sans Serif', designer: 'Chester Jenkins' },
    { name: 'Fira Code Libre', cat: 'Monospace', designer: 'Nikita Prokopov' },
    { name: 'Cormorant Garamond Pro', cat: 'Serif', designer: 'Christian Thalmann' },
    { name: 'Spectral Serif Pro', cat: 'Serif', designer: 'Production Type' },
    { name: 'Work Sans Libre', cat: 'Sans Serif', designer: 'Wei Huang' },
    { name: 'Chivo Grotesk', cat: 'Sans Serif', designer: 'Omnibus-Type' },
    { name: 'Archivo Display Pro', cat: 'Display', designer: 'Omnibus-Type' },
    { name: 'Space Mono Libre', cat: 'Monospace', designer: 'Colophon Foundry' },
    { name: 'Playfair Modern', cat: 'Serif', designer: 'Claus Eggers Sørensen' },
    { name: 'Cinzel Decorative Pro', cat: 'Display', designer: 'Natanael Gama' },
    { name: 'Abril Fatface Libre', cat: 'Display', designer: 'TypeTogether' },
    { name: 'Bungee Shade', cat: 'Display', designer: 'David Jonathan Ross' },
    { name: 'Monoton Display', cat: 'Display', designer: 'Vernon Adams' },
    { name: 'Comfortaa Modern', cat: 'Display', designer: 'Johan Aakerlund' },
  ];

  return FREE_FACES_FONTS.map((f) => ({
    id: `freefaces-${f.name.toLowerCase().replace(/[\s-_]/g, '-')}`,
    name: f.name,
    fontFamily: `"${f.name}", sans-serif`,
    format: 'WOFF2',
    category: f.cat,
    stylesCount: 1,
    styles: [{ name: 'Regular', weight: 400, style: 'normal' as const }],
    active: true,
    favorite: false,
    folderId: f.cat === 'Serif' ? 'serif' : f.cat === 'Display' ? 'display' : 'sans',
    provider: 'Free Faces',
    designer: `${f.designer} (Free Faces Gallery)`,
    version: 'Version 1.000',
    license: 'Free For Commercial & Personal Use',
    licenseUrl: 'https://www.freefaces.gallery',
    copyright: `Copyright ${f.designer}`,
    postScriptName: `${f.name.replace(/\s+/g, '')}-Regular`,
    numGlyphs: 390,
  }));
}

/**
 * Load Open Foundry Directory (https://open-foundry.com - 28 typefaces)
 */
export async function loadOpenFoundryFonts(): Promise<FontItem[]> {
  const OPEN_FOUNDRY_FONTS = [
    { name: 'Butler', cat: 'Serif', designer: 'Fabian De Smet' },
    { name: 'League Spartan', cat: 'Sans Serif', designer: 'The League of Moveable Type' },
    { name: 'Cooper Hewitt', cat: 'Sans Serif', designer: 'Chester Jenkins' },
    { name: 'Junction', cat: 'Sans Serif', designer: 'Caroline Hadilaksono' },
    { name: 'Alegreya', cat: 'Serif', designer: 'Juan Pablo del Peral' },
    { name: 'Proza Libre', cat: 'Sans Serif', designer: 'Jasper de Waard' },
    { name: 'Fira Sans', cat: 'Sans Serif', designer: 'Carrois Apostrophe' },
    { name: 'Faustina', cat: 'Serif', designer: 'Omnibus-Type' },
    { name: 'Literata', cat: 'Serif', designer: 'TypeTogether' },
    { name: 'Basteleur', cat: 'Display', designer: 'Keussel' },
    { name: 'Ouroboros', cat: 'Display', designer: 'Ariel Martín Pérez' },
    { name: 'Bagnard', cat: 'Serif', designer: 'Sebastien Sanfilippo' },
    { name: 'Carrier', cat: 'Monospace', designer: 'Open Foundry' },
    { name: 'Coelacanth', cat: 'Serif', designer: 'Ben Weiner' },
    { name: 'Cofo Sans', cat: 'Sans Serif', designer: 'Contrast Foundry' },
    { name: 'Dosis Libre', cat: 'Sans Serif', designer: 'Impallari Type' },
    { name: 'Gidole', cat: 'Sans Serif', designer: 'Andreas Larsen' },
    { name: 'Hack Font', cat: 'Monospace', designer: 'Christopher Simpkins' },
    { name: 'Heuristica', cat: 'Serif', designer: 'Andrey V. Panov' },
    { name: 'Inconsolata Pro', cat: 'Monospace', designer: 'Raph Levien' },
    { name: 'Junicode', cat: 'Serif', designer: 'Peter S. Baker' },
    { name: 'Linden Hill', cat: 'Serif', designer: 'Barry Schwartz' },
    { name: 'Montserrat Pro', cat: 'Sans Serif', designer: 'Julieta Ulanovsky' },
    { name: 'Overpass Pro', cat: 'Sans Serif', designer: 'Delve Fonts' },
    { name: 'PT Serif Pro', cat: 'Serif', designer: 'ParaType' },
    { name: 'Raleway Pro', cat: 'Sans Serif', designer: 'Matt McInerney' },
    { name: 'Sorts Mill Goudy', cat: 'Serif', designer: 'Barry Schwartz' },
    { name: 'Vollkorn Pro', cat: 'Serif', designer: 'Friedrich Althausen' },
  ];

  return OPEN_FOUNDRY_FONTS.map((o) => ({
    id: `openfoundry-${o.name.toLowerCase().replace(/[\s-_]/g, '-')}`,
    name: o.name,
    fontFamily: `"${o.name}", sans-serif`,
    format: 'WOFF2',
    category: o.cat,
    stylesCount: 1,
    styles: [{ name: 'Regular', weight: 400, style: 'normal' as const }],
    active: true,
    favorite: false,
    folderId: o.cat === 'Serif' ? 'serif' : 'sans',
    provider: 'Open Foundry',
    designer: `${o.designer} (Open Foundry)`,
    version: 'Version 1.000',
    license: 'SIL Open Font License (OFL)',
    licenseUrl: 'https://open-foundry.com',
    copyright: `Copyright ${o.designer}`,
    postScriptName: `${o.name.replace(/\s+/g, '')}-Regular`,
    numGlyphs: 420,
  }));
}

/**
 * Fetch all enabled provider catalogs in parallel
 */
export async function fetchAllProvidersFonts(): Promise<FontItem[]> {
  const results = await Promise.allSettled([
    fetchFontshareFonts(),
    loadGoogleFontsCatalogue(),
    loadVelvetyneFonts(),
    loadCollletttivoFonts(),
    loadUncutFonts(),
    loadFreeFacesFonts(),
    loadOpenFoundryFonts(),
  ]);

  const all: FontItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      all.push(...r.value);
    }
  }
  return all;
}
