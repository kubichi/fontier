export type FontFormat = 'TTF' | 'OTF' | 'WOFF' | 'WOFF2';

export type FontCategory =
  | 'Sans Serif'
  | 'Serif'
  | 'Slab Serif'
  | 'Display'
  | 'Monospace'
  | 'Handwriting'
  | 'Pixel'
  | string;

export type TextAlignment = 'left' | 'center' | 'right';

export type ViewMode = 'list' | 'grid';

export type DetailTab = 'styles' | 'glyphs' | 'waterfall' | 'details';

export interface FontStyle {
  name: string;
  weight: number;
  style: 'normal' | 'italic';
}

export interface FontItem {
  id: string;
  name: string;
  fontFamily: string;
  format: FontFormat;
  category: FontCategory;
  tags?: string[]; // System and user tags e.g. ['Bold', 'Italic', 'Mono', 'Serif']
  stylesCount: number;
  styles: FontStyle[];
  active: boolean;
  favorite: boolean;
  folderId?: string; // id of folder it belongs to
  provider: 'Google' | 'Local' | 'System';
  familyGroup?: string; // Base family name for grouping (e.g. 'Archivo', 'Apfel Grotezk')
  designer?: string;
  version?: string;
  license?: string;
  licenseUrl?: string;
  copyright?: string;
  postScriptName?: string;
  numGlyphs?: number;
  fileSize?: number;
  fileName?: string;
  filePath?: string;
  unitsPerEm?: number;
  isCustomUploaded?: boolean;
  fontUrl?: string;
  supportedCodepoints?: number[];
  licenseFilePath?: string;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId?: string; // optional parent folder id for subfolders
  collapsed?: boolean;
  count?: number;
  icon?: string;
  color?: string;
  folderPath?: string; // Full physical disk path for local folders
}


export interface FontFilters {
  category: string;
  format: string;
  status: 'all' | 'active' | 'inactive' | 'favorites';
  provider: 'all' | 'local' | 'google' | 'system';
}

export interface AppSettings {
  appTheme: 'dark' | 'light' | 'mica' | 'oled' | 'slate';
  defaultFontSize: number;
  autoActivateOnImport: boolean;
  rowDensity: 'comfortable' | 'compact';
  uiFont?: string;
  showTitleBarControls?: boolean;
}

export interface ColorScheme {
  id: string;
  name: string;
  textColor: string;
  bgColor: string;
}

