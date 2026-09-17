import React, { useState } from 'react';
import {
  X,
  Heart,
  Check,
  ShieldCheck,
  ExternalLink,
  Copy,
  CheckCheck,
  Maximize2,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { FontItem } from '../types';
import { autoTagFontMetadata } from '../utils/autoTagger';

interface FontPropertiesPanelProps {
  font: FontItem | null;
  onClose: () => void;
  onOpenDetail: (font: FontItem) => void;
  onToggleActive: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateFont?: (id: string, updates: Partial<FontItem>) => void;
  textColor?: string;
  bgColor?: string;
  theme?: 'dark' | 'light';
}

export const FontPropertiesPanel: React.FC<FontPropertiesPanelProps> = ({
  font,
  onClose,
  onOpenDetail,
  onToggleActive,
  onToggleFavorite,
  onUpdateFont,
  textColor = '#ffffff',
  bgColor = '#1e1e1e',
  theme = 'dark',
}) => {
  const [copiedCss, setCopiedCss] = useState(false);
  const [filterTagOpen, setFilterTagOpen] = useState(true);
  const [systemTagsOpen, setSystemTagsOpen] = useState(true);
  const [techSpecsOpen, setTechSpecsOpen] = useState(true);
  const [licensingOpen, setLicensingOpen] = useState(true);

  const isLight = theme === 'light';

  if (!font) return null;

  const copyCssDeclaration = () => {
    navigator.clipboard.writeText(`font-family: ${font.fontFamily};`);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'Variable';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <aside
      id="font-properties-panel"
      className={`w-80 md:w-88 border-l flex flex-col h-full shrink-0 select-none text-xs shadow-2xl z-20 animate-in slide-in-from-right duration-200 ${
        isLight
          ? 'bg-[#ffffff] border-[#e2e8f0] text-[#334155]'
          : 'bg-[#181818] border-[#282828] text-[#d0d0d0]'
      }`}
    >
      {/* Panel Top Header */}
      <div
        className={`h-11 px-4 border-b flex items-center justify-between shrink-0 ${
          isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#1b1b1b] border-[#2a2a2a]'
        }`}
      >
        <div className="flex items-center space-x-2">
          <Info className="w-3.5 h-3.5 text-[#16a34a]" />
          <span
            className={`font-semibold tracking-tight ${
              isLight ? 'text-[#0f172a]' : 'text-white'
            }`}
          >
            Font Properties
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onToggleFavorite(font.id)}
            className={`p-1 rounded transition-colors ${
              isLight
                ? 'hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#ef4444]'
                : 'hover:bg-[#252525] text-[#888888] hover:text-[#ef4444]'
            }`}
            title="Favorite font"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                font.favorite ? 'text-[#ef4444] fill-[#ef4444]' : ''
              }`}
            />
          </button>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isLight
                ? 'hover:bg-[#f1f5f9] text-[#64748b] hover:text-[#0f172a]'
                : 'hover:bg-[#252525] text-[#888888] hover:text-white'
            }`}
            title="Close panel"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Typeface Hero Preview */}
        <div
          className={`rounded-lg p-5 border flex flex-col items-center justify-center text-center shadow-inner relative overflow-hidden transition-colors ${
            isLight ? 'border-[#e2e8f0]' : 'border-[#333333]'
          }`}
          style={{ backgroundColor: bgColor }}
        >
          <span
            className="text-6xl font-bold mb-2 select-text"
            style={{ fontFamily: font.fontFamily, color: textColor }}
          >
            Aa
          </span>
          <span
            className="text-sm font-semibold tracking-wide truncate max-w-full select-text"
            style={{ fontFamily: font.fontFamily, color: textColor }}
          >
            {font.name}
          </span>
          <span
            className={`text-[10px] font-mono mt-1 ${
              isLight ? 'text-[#64748b]' : 'text-[#777777]'
            }`}
          >
            {font.styles[0]?.name || 'Regular'} • {font.format}
          </span>
        </div>

        {/* Activation & Quick Actions */}
        <div
          className={`flex items-center justify-between p-2.5 rounded-lg border ${
            isLight
              ? 'bg-[#f8fafc] border-[#e2e8f0]'
              : 'bg-[#202020] border-[#2e2e2e]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleActive(font.id)}
              className="focus:outline-none"
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
            <div>
              <span
                className={`font-medium block text-[11px] ${
                  isLight ? 'text-[#0f172a]' : 'text-white'
                }`}
              >
                {font.active ? 'Active in System' : 'Inactive Font'}
              </span>
              <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                {font.active ? 'Ready to use in design apps' : 'Click circle to activate'}
              </span>
            </div>
          </div>

          <button
            onClick={() => onOpenDetail(font)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors flex items-center space-x-1 ${
              isLight
                ? 'bg-white hover:bg-[#f1f5f9] text-[#16a34a] border-[#cbd5e1]'
                : 'bg-[#282828] hover:bg-[#333333] text-[#4ade80] hover:text-[#5eead4] border-[#3a3a3a]'
            }`}
          >
            <span>Alphabets</span>
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>

        {/* 1. COLLAPSIBLE FILTER TAG SECTION */}
        <div
          className={`rounded-lg border overflow-hidden transition-colors ${
            isLight ? 'bg-[#ffffff] border-[#e2e8f0]' : 'bg-[#202020] border-[#2b2b2b]'
          }`}
        >
          <button
            type="button"
            onClick={() => setFilterTagOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
              isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              {filterTagOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#16a34a]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
              )}
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  isLight ? 'text-[#334155]' : 'text-[#cccccc]'
                }`}
              >
                Filter Tag / Classification
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                font.category
                  ? isLight
                    ? 'bg-[#dcfce7] text-[#15803d]'
                    : 'bg-[#1c2e22] text-[#4ade80]'
                  : isLight
                  ? 'bg-[#f1f5f9] text-[#94a3b8]'
                  : 'bg-[#292929] text-[#777777]'
              }`}
            >
              {font.category || 'Untagged'}
            </span>
          </button>

          {filterTagOpen && (
            <div className={`p-3 pt-0 space-y-2 border-t ${isLight ? 'border-[#f1f5f9]' : 'border-[#282828]'}`}>
              <p className={`text-[10px] mt-2.5 ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
                Tag this font to match search filters:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
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
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors border ${
                        isSelected
                          ? isLight
                            ? 'border-[#16a34a] bg-[#16a34a] text-white font-semibold'
                            : 'border-[#4ade80] bg-[#22c55e] text-black font-semibold'
                          : isLight
                          ? 'border-[#cbd5e1] bg-[#f8fafc] text-[#475569] hover:bg-[#f1f5f9]'
                          : 'border-[#333333] bg-[#252525] text-[#aaaaaa] hover:text-white hover:bg-[#2e2e2e]'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 inline mr-1 stroke-[3]" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 2. COLLAPSIBLE SYSTEM TAGS SECTION */}
        <div
          className={`rounded-lg border overflow-hidden transition-colors ${
            isLight ? 'bg-[#ffffff] border-[#e2e8f0]' : 'bg-[#202020] border-[#2b2b2b]'
          }`}
        >
          <button
            type="button"
            onClick={() => setSystemTagsOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
              isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              {systemTagsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#16a34a]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
              )}
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  isLight ? 'text-[#334155]' : 'text-[#cccccc]'
                }`}
              >
                System Tags (Auto-detected)
              </span>
            </div>
            <span
              className={`text-[10px] font-mono ${
                isLight ? 'text-[#94a3b8]' : 'text-[#777777]'
              }`}
            >
              {font.tags?.length || 0} tags
            </span>
          </button>

          {systemTagsOpen && (
            <div className={`p-3 pt-0 space-y-2 border-t ${isLight ? 'border-[#f1f5f9]' : 'border-[#282828]'}`}>
              <div className="flex items-center justify-between mt-2.5">
                <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
                  Metadata tag analyzer
                </span>
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
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                    isLight
                      ? 'border-[#cbd5e1] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a]'
                      : 'border-[#333333] bg-[#252525] hover:bg-[#2e2e2e] text-[#cccccc]'
                  }`}
                  title="Scan font metadata and automatically apply matching tags"
                >
                  <span>Auto-scan</span>
                </button>
              </div>

              {/* Existing tags list */}
              {font.tags && font.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {font.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        isLight
                          ? 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]'
                          : 'bg-[#172b1e] text-[#4ade80] border-[#225032]'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={`text-[10px] italic ${isLight ? 'text-[#94a3b8]' : 'text-[#666666]'}`}>
                  No tags detected yet. Click Auto-scan to scan font metadata.
                </p>
              )}

              {/* Quick tag toggles */}
              <div className="flex flex-wrap gap-1 pt-1">
                {['Mono', 'Bold', 'Italic', 'Light', 'Condensed'].map((t) => {
                  const hasTag = font.tags?.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const current = font.tags || [];
                        const updated = hasTag
                          ? current.filter((x) => x !== t)
                          : [...current, t];
                        onUpdateFont?.(font.id, { tags: updated });
                      }}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                        hasTag
                          ? isLight
                            ? 'border-[#059669] bg-[#10b981] text-white'
                            : 'border-[#4ade80] bg-[#16a34a] text-white'
                          : isLight
                          ? 'border-[#e2e8f0] bg-[#f8fafc] text-[#64748b] hover:bg-[#f1f5f9]'
                          : 'border-[#2d2d2d] bg-[#1a1a1a] text-[#777777] hover:text-[#bbbbbb]'
                      }`}
                    >
                      {hasTag ? `✓ ${t}` : `+ ${t}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. COLLAPSIBLE FILE TECHNICAL SPECIFICATIONS */}
        <div
          className={`rounded-lg border overflow-hidden transition-colors ${
            isLight ? 'bg-[#ffffff] border-[#e2e8f0]' : 'bg-[#1e1e1e] border-[#2b2b2b]'
          }`}
        >
          <button
            type="button"
            onClick={() => setTechSpecsOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
              isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              {techSpecsOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#16a34a]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
              )}
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  isLight ? 'text-[#334155]' : 'text-[#cccccc]'
                }`}
              >
                File & Technical Specifications
              </span>
            </div>
            <span className="px-1.5 py-0.5 bg-[#252525] border border-[#383838] font-mono text-[#4ade80] font-bold text-[10px] rounded">
              .{font.format}
            </span>
          </button>

          {techSpecsOpen && (
            <div
              className={`text-xs divide-y border-t ${
                isLight
                  ? 'divide-[#f1f5f9] border-[#f1f5f9]'
                  : 'divide-[#282828] border-[#282828]'
              }`}
            >
              {/* Classification */}
              <div className="flex items-center justify-between p-2.5">
                <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                  Category Tag
                </span>
                <span
                  className={`font-medium text-[11px] ${
                    isLight ? 'text-[#0f172a]' : 'text-white'
                  }`}
                >
                  {font.category || 'Untagged'}
                </span>
              </div>

              {/* Version Number */}
              <div className="flex items-center justify-between p-2.5">
                <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                  Version Number
                </span>
                <span
                  className={`font-mono text-[11px] font-medium truncate max-w-[150px] ${
                    isLight ? 'text-[#0f172a]' : 'text-white'
                  }`}
                  title={font.version || 'Version 1.000'}
                >
                  {font.version || 'Version 1.000'}
                </span>
              </div>

              {/* Designer / Author */}
              <div className="flex items-start justify-between p-2.5">
                <span className={`text-[11px] shrink-0 ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                  Designer
                </span>
                <span
                  className={`font-medium text-right text-[11px] truncate max-w-[160px] ${
                    isLight ? 'text-[#0f172a]' : 'text-white'
                  }`}
                  title={font.designer || 'Independent Foundry'}
                >
                  {font.designer || 'Independent Foundry'}
                </span>
              </div>

              {/* PostScript Name */}
              {font.postScriptName && (
                <div className="flex items-center justify-between p-2.5">
                  <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                    PostScript Name
                  </span>
                  <span
                    className={`font-mono text-[10px] truncate max-w-[150px] ${
                      isLight ? 'text-[#334155]' : 'text-[#d4d4d4]'
                    }`}
                  >
                    {font.postScriptName}
                  </span>
                </div>
              )}

              {/* Glyphs count */}
              <div className="flex items-center justify-between p-2.5">
                <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                  Glyphs Count
                </span>
                <span
                  className={`font-mono text-[11px] ${isLight ? 'text-[#0f172a]' : 'text-white'}`}
                >
                  {font.numGlyphs ? `${font.numGlyphs.toLocaleString()} glyphs` : 'Standard charset'}
                </span>
              </div>

              {/* File Size */}
              <div className="flex items-center justify-between p-2.5">
                <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                  File Size
                </span>
                <span
                  className={`font-mono text-[11px] ${isLight ? 'text-[#0f172a]' : 'text-white'}`}
                >
                  {formatBytes(font.fileSize)}
                </span>
              </div>

              {/* File Name & Source */}
              <div className="p-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#888888] text-[11px]">File Source</span>
                  <span className="text-[10px] text-[#22c55e] font-medium">
                    {font.provider === 'Local' ? 'Local Storage Folder' : 'Google Fonts'}
                  </span>
                </div>
                {font.fileName && (
                  <div className="font-mono text-[10px] text-[#777777] truncate bg-[#161616] p-1.5 rounded border border-[#282828]" title={font.filePath || font.fileName}>
                    {font.filePath || font.fileName}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 4. COLLAPSIBLE LICENSING & USAGE RIGHTS */}
        <div
          className={`rounded-lg border overflow-hidden transition-colors ${
            isLight ? 'bg-[#ffffff] border-[#e2e8f0]' : 'bg-[#1e1e1e] border-[#2b2b2b]'
          }`}
        >
          <button
            type="button"
            onClick={() => setLicensingOpen((prev) => !prev)}
            className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
              isLight ? 'hover:bg-[#f8fafc]' : 'hover:bg-[#252525]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              {licensingOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-[#16a34a]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-[#888888]" />
              )}
              <span
                className={`text-[10px] uppercase font-bold tracking-wider ${
                  isLight ? 'text-[#334155]' : 'text-[#cccccc]'
                }`}
              >
                Licensing & Usage Rights
              </span>
            </div>
            <ShieldCheck className="w-3.5 h-3.5 text-[#16a34a]" />
          </button>

          {licensingOpen && (
            <div className={`p-3 pt-0 space-y-3 border-t ${isLight ? 'border-[#f1f5f9]' : 'border-[#282828]'}`}>
              <div className="flex items-start space-x-2 mt-2.5">
                <ShieldCheck className="w-4 h-4 text-[#16a34a] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span
                    className={`font-semibold block text-xs ${
                      isLight ? 'text-[#0f172a]' : 'text-white'
                    }`}
                  >
                    {font.license || 'Standard Font License'}
                  </span>
                  {font.licenseUrl ? (
                    <a
                      href={font.licenseUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#0284c7] hover:underline flex items-center space-x-1"
                    >
                      <span>View Official License Document</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
                      Standard desktop and personal usage permit.
                    </span>
                  )}
                </div>
              </div>

              {font.copyright && (
                <div
                  className={`pt-2 border-t text-[11px] leading-relaxed ${
                    isLight
                      ? 'border-[#e2e8f0] text-[#64748b]'
                      : 'border-[#2a2a2a] text-[#888888]'
                  }`}
                >
                  <span
                    className={`font-medium block mb-0.5 ${
                      isLight ? 'text-[#334155]' : 'text-[#aaaaaa]'
                    }`}
                  >
                    Copyright Notice:
                  </span>
                  <span className="italic">{font.copyright}</span>
                </div>
              )}

              {/* Commercial & Personal Usage Badges */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div
                  className={`p-2 rounded flex items-center space-x-1.5 border ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0]'
                      : 'bg-[#242424] border-[#303030]'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span
                    className={`text-[10px] font-medium ${
                      isLight ? 'text-[#334155]' : 'text-[#cccccc]'
                    }`}
                  >
                    Commercial Use
                  </span>
                </div>
                <div
                  className={`p-2 rounded flex items-center space-x-1.5 border ${
                    isLight
                      ? 'bg-[#f8fafc] border-[#e2e8f0]'
                      : 'bg-[#242424] border-[#303030]'
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span
                    className={`text-[10px] font-medium ${
                      isLight ? 'text-[#334155]' : 'text-[#cccccc]'
                    }`}
                  >
                    Personal Use
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Copy CSS helper */}
        <div className="pt-2">
          <button
            onClick={copyCssDeclaration}
            className={`w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded border transition-colors text-xs font-medium ${
              isLight
                ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#0f172a] border-[#cbd5e1]'
                : 'bg-[#242424] hover:bg-[#2c2c2c] text-[#e0e0e0] hover:text-white border-[#383838]'
            }`}
          >
            {copiedCss ? (
              <>
                <CheckCheck className="w-3.5 h-3.5 text-[#16a34a]" />
                <span className="text-[#16a34a] font-semibold">Copied font-family CSS!</span>
              </>
            ) : (
              <>
                <Copy className={`w-3.5 h-3.5 ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`} />
                <span>Copy CSS font-family</span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
};
