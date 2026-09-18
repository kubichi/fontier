import React, { useState, useRef, useEffect } from 'react';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  LayoutGrid,
  RotateCcw,
  Palette,
  Sun,
  Moon,
  Type,
  Info,
  Plus,
  Trash2,
} from 'lucide-react';
import { TextAlignment, ViewMode, ColorScheme } from '../types';
import { PRESET_COLOR_SCHEMES } from '../data/defaultFonts';

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  alignment: TextAlignment;
  onAlignmentChange: (alignment: TextAlignment) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  textColor: string;
  onTextColorChange: (color: string) => void;
  bgColor: string;
  onBgColorChange: (color: string) => void;
  onResetSettings: () => void;
  showInspector?: boolean;
  onToggleInspector?: () => void;
  theme?: 'dark' | 'light';
}

export const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  alignment,
  onAlignmentChange,
  fontSize,
  onFontSizeChange,
  textColor,
  onTextColorChange,
  bgColor,
  onBgColorChange,
  onResetSettings,
  showInspector = true,
  onToggleInspector,
  theme = 'dark',
}) => {
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [customPresets, setCustomPresets] = useState<ColorScheme[]>(() => {
    try {
      const saved = localStorage.getItem('fontbase_custom_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const colorPopoverRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  // Close color popover on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) {
        setShowColorPopover(false);
      }
    }
    if (showColorPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPopover]);

  const isLightMode = bgColor === '#ffffff' || bgColor === '#fef3c7' || bgColor === '#ffe4e6';

  const toggleLightDark = () => {
    if (isLightMode) {
      onBgColorChange('#18181b');
      onTextColorChange('#e4e4e7');
    } else {
      onBgColorChange('#ffffff');
      onTextColorChange('#111111');
    }
  };

  const handleSaveCurrentAsPreset = () => {
    const newPreset: ColorScheme = {
      id: `custom-${Date.now()}`,
      name: `Custom ${customPresets.length + 1}`,
      textColor,
      bgColor,
    };
    const updated = [newPreset, ...customPresets];
    setCustomPresets(updated);
    try {
      localStorage.setItem('fontbase_custom_presets', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleDeleteCustomPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== id);
    setCustomPresets(updated);
    try {
      localStorage.setItem('fontbase_custom_presets', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`h-12 border-b flex items-center justify-between px-4 select-none z-20 text-xs shrink-0 transition-colors ${
        isLight
          ? 'bg-[#ffffff] border-[#e2e8f0] text-[#334155]'
          : 'bg-[#1a1a1a] border-[#282828] text-[#cccccc]'
      }`}
    >
      {/* Left side: View switcher & Text alignment & Colors Indicator */}
      <div className="flex items-center space-x-2.5">
        {/* List / Grid view switcher (Height: h-7) */}
        <div
          className={`h-7 flex items-center p-0.5 rounded border ${
            isLight ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-[#222222] border-[#333333]'
          }`}
        >
          <button
            id="view-mode-list"
            onClick={() => onViewModeChange('list')}
            className={`h-full px-2 rounded transition-colors flex items-center justify-center ${
              viewMode === 'list'
                ? isLight
                  ? 'bg-white text-[#0f172a] shadow-xs'
                  : 'bg-[#333333] text-white shadow-xs'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            id="view-mode-grid"
            onClick={() => onViewModeChange('grid')}
            className={`h-full px-2 rounded transition-colors flex items-center justify-center ${
              viewMode === 'grid'
                ? isLight
                  ? 'bg-white text-[#0f172a] shadow-xs'
                  : 'bg-[#333333] text-white shadow-xs'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Alignment options: Left, Center, Right (Height: h-7) */}
        <div
          className={`h-7 flex items-center p-0.5 rounded border ${
            isLight ? 'bg-[#f1f5f9] border-[#cbd5e1]' : 'bg-[#222222] border-[#333333]'
          }`}
        >
          <button
            id="align-text-left"
            onClick={() => onAlignmentChange('left')}
            className={`h-full px-2 rounded transition-colors flex items-center justify-center ${
              alignment === 'left'
                ? isLight
                  ? 'bg-white text-accent shadow-xs'
                  : 'bg-[#333333] text-accent shadow-xs'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
            title="Align text left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            id="align-text-center"
            onClick={() => onAlignmentChange('center')}
            className={`h-full px-2 rounded transition-colors flex items-center justify-center ${
              alignment === 'center'
                ? isLight
                  ? 'bg-white text-accent shadow-xs'
                  : 'bg-[#333333] text-accent shadow-xs'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
            title="Align text center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            id="align-text-right"
            onClick={() => onAlignmentChange('right')}
            className={`h-full px-2 rounded transition-colors flex items-center justify-center ${
              alignment === 'right'
                ? isLight
                  ? 'bg-white text-accent shadow-xs'
                  : 'bg-[#333333] text-accent shadow-xs'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a]'
                : 'text-[#888888] hover:text-[#cccccc]'
            }`}
            title="Align text right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Colors Tab: Same scale/height (h-7) as align and view, showing round indicators */}
        <div className="relative" ref={colorPopoverRef}>
          <button
            id="color-customization-btn"
            onClick={() => setShowColorPopover(!showColorPopover)}
            className={`h-7 flex items-center px-2 rounded border transition-colors ${
              showColorPopover
                ? isLight
                  ? 'border-accent bg-[#f8fafc]'
                  : 'border-accent bg-[#292929]'
                : isLight
                ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] border-[#cbd5e1]'
                : 'bg-[#222222] hover:bg-[#292929] border-[#333333]'
            }`}
            title="Preview colors (Click to customize)"
          >
            <div className="flex items-center space-x-1">
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs block"
                style={{ backgroundColor: bgColor }}
                title={`Canvas Background: ${bgColor}`}
              />
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs block"
                style={{ backgroundColor: textColor }}
                title={`Text Color: ${textColor}`}
              />
            </div>
          </button>

          {/* Color Popover */}
          {showColorPopover && (
            <div
              className={`absolute left-0 mt-2 w-80 rounded-lg shadow-2xl border p-3.5 pb-4 z-50 animate-in fade-in-50 zoom-in-95 ${
                isLight
                  ? 'bg-[#ffffff] border-[#cbd5e1] text-[#0f172a]'
                  : 'bg-[#1f1f1f] border-[#383838] text-[#e0e0e0]'
              }`}
            >
              {/* Header with Dark / Light toggle moved inside */}
              <div
                className={`pb-2.5 mb-3 border-b flex items-center justify-between ${
                  isLight ? 'border-[#e2e8f0]' : 'border-[#303030]'
                }`}
              >
                <div>
                  <span className={`text-xs font-semibold block ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                    Preview Colors
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                    Customize font canvas & text
                  </span>
                </div>

                {/* Dark / Light Toggle Pill inside Colors Tab */}
                <button
                  type="button"
                  onClick={toggleLightDark}
                  className={`flex items-center px-2 py-1 rounded border transition-colors gap-1.5 ${
                    isLight
                      ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#0f172a] border-[#cbd5e1]'
                      : 'bg-[#282828] hover:bg-[#323232] text-[#cccccc] border-[#3c3c3c]'
                  }`}
                  title="Toggle between light and dark preview"
                >
                  {isLightMode ? (
                    <>
                      <Sun className="w-3 h-3 text-[#eab308]" />
                      <span className="text-[11px] font-medium">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3 h-3 text-accent" />
                      <span className="text-[11px] font-medium">Dark</span>
                    </>
                  )}
                </button>
              </div>

              {/* Text Color Setting */}
              <div className="mb-3">
                <label className="text-[11px] flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Type className="w-3 h-3 text-accent" />
                    Text Color
                  </span>
                  <span className="font-mono text-[10px] text-[#888888]">{textColor}</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => onTextColorChange(e.target.value)}
                    className="w-8 h-8 rounded border border-[#888888]/30 bg-transparent cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={textColor}
                    onChange={(e) => onTextColorChange(e.target.value)}
                    className={`flex-1 rounded px-2 py-1 text-xs font-mono border ${
                      isLight
                        ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]'
                        : 'bg-[#282828] border-[#3e3e3e] text-[#e0e0e0]'
                    }`}
                    placeholder="#111111"
                  />
                </div>
              </div>

              {/* Background Color Setting */}
              <div className="mb-3">
                <label className="text-[11px] flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1">
                    <Palette className="w-3 h-3 text-[#ec4899]" />
                    Background Color
                  </span>
                  <span className="font-mono text-[10px] text-[#888888]">{bgColor}</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => onBgColorChange(e.target.value)}
                    className="w-8 h-8 rounded border border-[#888888]/30 bg-transparent cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => onBgColorChange(e.target.value)}
                    className={`flex-1 rounded px-2 py-1 text-xs font-mono border ${
                      isLight
                        ? 'bg-[#f8fafc] border-[#cbd5e1] text-[#0f172a]'
                        : 'bg-[#282828] border-[#3e3e3e] text-[#e0e0e0]'
                    }`}
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              {/* Preset Colors */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold ${
                      isLight ? 'text-[#64748b]' : 'text-[#888888]'
                    }`}
                  >
                    Preset Colors ({PRESET_COLOR_SCHEMES.length + customPresets.length})
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-1 pb-1.5 pr-1.5">
                  {PRESET_COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      type="button"
                      onClick={() => {
                        onTextColorChange(scheme.textColor);
                        onBgColorChange(scheme.bgColor);
                      }}
                      className="group relative h-7 rounded border border-black/10 shadow-2xs overflow-hidden flex items-center justify-center transition-transform hover:scale-[1.03] hover:z-10"
                      style={{ backgroundColor: scheme.bgColor }}
                      title={`${scheme.name} (Text: ${scheme.textColor})`}
                    >
                      <span
                        className="text-[11px] font-bold font-serif"
                        style={{ color: scheme.textColor }}
                      >
                        Aa
                      </span>
                    </button>
                  ))}
                  {customPresets.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => {
                        onTextColorChange(preset.textColor);
                        onBgColorChange(preset.bgColor);
                      }}
                      className="group relative h-7 rounded border border-black/10 shadow-2xs overflow-hidden flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.03] hover:z-10"
                      style={{ backgroundColor: preset.bgColor }}
                      title={preset.name}
                    >
                      <span
                        className="text-[11px] font-bold font-serif"
                        style={{ color: preset.textColor }}
                      >
                        Aa
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                        className="absolute top-0 right-0 p-0.5 bg-black/60 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Delete custom preset"
                      >
                        <Trash2 className="w-2 h-2" />
                      </button>
                    </div>
                  ))}
                  {/* Same size rectangle with plus icon to add current colors as preset */}
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsPreset}
                    className="h-7 rounded border border-dashed border-neutral-500 hover:border-accent hover:bg-accent-subtle text-neutral-400 hover:text-accent flex items-center justify-center transition-all hover:scale-[1.03] hover:z-10"
                    title={`Add current colors (${textColor} on ${bgColor}) to presets`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Font size slider & Reset */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <input
            id="font-size-slider"
            type="range"
            min="12"
            max="120"
            step="1"
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            style={{ accentColor: 'var(--accent-color, #38bdf8)' }}
            className={`w-28 sm:w-40 h-1.5 rounded-lg appearance-none cursor-pointer ${
              isLight ? 'bg-[#cbd5e1]' : 'bg-[#333333]'
            }`}
          />
          <span
            className={`w-10 text-right font-mono text-[11px] ${
              isLight ? 'text-[#475569]' : 'text-[#cccccc]'
            }`}
          >
            {fontSize}px
          </span>
        </div>

        <button
          id="reset-preview-settings"
          onClick={onResetSettings}
          className={`p-1.5 transition-colors rounded ${
            isLight
              ? 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]'
              : 'text-[#777777] hover:text-[#dddddd] hover:bg-[#252525]'
          }`}
          title="Reset font size and settings"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {onToggleInspector && (
          <button
            id="toggle-font-properties-btn"
            onClick={onToggleInspector}
            className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors border ${
              showInspector
                ? 'bg-accent-subtle text-accent border-accent-subtle'
                : isLight
                ? 'text-[#64748b] hover:text-[#0f172a] border-transparent hover:bg-[#f1f5f9]'
                : 'text-[#888888] hover:text-[#dddddd] border-transparent hover:bg-[#252525]'
            }`}
            title="Toggle Font Properties Inspector panel"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px]">Properties</span>
          </button>
        )}
      </div>
    </div>
  );
};


