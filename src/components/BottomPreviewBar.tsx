import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, RefreshCw, Sparkles, X } from 'lucide-react';
import { PRESET_PHRASES } from '../data/defaultFonts';

interface BottomPreviewBarProps {
  previewText: string;
  onPreviewTextChange: (text: string) => void;
  theme?: 'dark' | 'light';
}

export const BottomPreviewBar: React.FC<BottomPreviewBarProps> = ({
  previewText,
  onPreviewTextChange,
  theme = 'dark',
}) => {
  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);
  const isLight = theme === 'light';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setShowPresets(false);
      }
    }
    if (showPresets) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPresets]);

  return (
    <div
      className={`h-11 border-t flex items-center px-4 select-none shrink-0 relative z-30 transition-colors ${
        isLight
          ? 'bg-[#ffffff] border-[#e2e8f0]'
          : 'bg-[#1a1a1a] border-[#2a2a2a]'
      }`}
    >
      {/* Input area */}
      <div
        className={`flex-1 flex items-center rounded h-8 px-3 transition-colors border ${
          isLight
            ? 'bg-[#f8fafc] hover:bg-[#f1f5f9] focus-within:bg-white border-[#cbd5e1] focus-within:border-[#16a34a]'
            : 'bg-[#222222] hover:bg-[#252525] focus-within:bg-[#262626] border-[#333333] focus-within:border-[#4ade80]'
        }`}
      >
        <input
          id="preview-text-input"
          type="text"
          value={previewText}
          onChange={(e) => onPreviewTextChange(e.target.value)}
          placeholder="Type custom text to preview across all fonts..."
          className={`w-full bg-transparent text-xs focus:outline-none ${
            isLight
              ? 'text-[#0f172a] placeholder-[#94a3b8]'
              : 'text-[#f0f0f0] placeholder-[#666666]'
          }`}
        />

        {previewText && (
          <button
            onClick={() => onPreviewTextChange('')}
            className={`p-0.5 ml-1 transition-colors ${
              isLight
                ? 'text-[#94a3b8] hover:text-[#0f172a]'
                : 'text-[#777777] hover:text-[#dddddd]'
            }`}
            title="Clear preview text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Pangram presets dropdown toggle */}
      <div className="ml-2 relative" ref={presetsRef}>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className={`h-8 px-2.5 rounded border flex items-center space-x-1.5 text-xs transition-colors ${
            isLight
              ? 'bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569] hover:text-[#0f172a] border-[#cbd5e1]'
              : 'bg-[#222222] hover:bg-[#2a2a2a] text-[#aaaaaa] hover:text-white border-[#333333]'
          }`}
          title="Choose pangram sample text"
        >
          <span className="text-[11px] font-medium">Pangrams</span>
          {showPresets ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronUp className="w-3 h-3" />
          )}
        </button>

        {showPresets && (
          <div
            className={`absolute right-0 bottom-10 w-80 rounded-lg shadow-2xl border p-2 z-50 text-xs space-y-1 ${
              isLight
                ? 'bg-[#ffffff] border-[#cbd5e1] text-[#0f172a]'
                : 'bg-[#1f1f1f] border-[#383838] text-[#dddddd]'
            }`}
          >
            <div
              className={`px-2 py-1 text-[10px] font-semibold uppercase tracking-wider border-b ${
                isLight ? 'text-[#64748b] border-[#e2e8f0]' : 'text-[#888888] border-[#303030]'
              }`}
            >
              Sample Pangrams & Phrases
            </div>
            <div className="max-h-60 overflow-y-auto space-y-0.5 pt-1">
              {PRESET_PHRASES.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onPreviewTextChange(phrase);
                    setShowPresets(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded transition-colors truncate block text-xs ${
                    isLight
                      ? 'hover:bg-[#f1f5f9] text-[#334155] hover:text-[#0f172a]'
                      : 'hover:bg-[#2d2d2d] text-[#d4d4d4] hover:text-white'
                  }`}
                  title={phrase}
                >
                  {phrase}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
