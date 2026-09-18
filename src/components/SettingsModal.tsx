import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, RotateCcw, Check, Sparkles, Palette } from 'lucide-react';
import { AppSettings } from '../types';

const ACCENT_PRESETS = [
  { name: 'Sky Blue (Default)', color: '#38bdf8' },
  { name: 'Ocean Blue', color: '#0284c7' },
  { name: 'Royal Blue', color: '#2563eb' },
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Purple', color: '#a855f7' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Cyan', color: '#06b6d4' },
];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetAllData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetAllData,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [appVersion, setAppVersion] = useState<string>('1.0.0');

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.getAppVersion?.().then((ver: string) => {
        if (ver) setAppVersion(ver);
      }).catch(() => {});
    }
  }, []);

  if (!isOpen) return null;

  const isLight = settings.appTheme === 'light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden text-xs animate-in fade-in-50 zoom-in-95 duration-150 border ${
          isLight
            ? 'bg-[#ffffff] border-[#cbd5e1] text-[#1e293b]'
            : 'bg-[#1e1e1e] border-[#333333] text-[#d0d0d0]'
        }`}
      >
        {/* Header */}
        <div
          className={`h-12 px-5 border-b flex items-center justify-between ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#181818] border-[#2a2a2a]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <h2 className={`text-sm font-semibold tracking-tight ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
              Preferences & Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors ${
              isLight
                ? 'hover:bg-[#e2e8f0] text-[#64748b] hover:text-[#0f172a]'
                : 'hover:bg-[#282828] text-[#888888] hover:text-white'
            }`}
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Theme Selection: Black & White */}
          <div className="space-y-2">
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block ${
                isLight ? 'text-[#64748b]' : 'text-[#888888]'
              }`}
            >
              Application Theme
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Black Theme */}
              <button
                type="button"
                id="theme-black-option"
                onClick={() => onUpdateSettings({ appTheme: 'dark' })}
                className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all relative ${
                  !isLight
                    ? 'border-accent bg-accent-subtle text-white ring-1 ring-accent'
                    : isLight
                    ? 'border-[#e2e8f0] bg-[#f8fafc] hover:bg-[#f1f5f9] text-[#475569]'
                    : 'border-[#2d2d2d] bg-[#161616] hover:bg-[#202020] text-[#aaaaaa]'
                }`}
              >
                {!isLight && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
                <div className="w-6 h-6 rounded-full bg-[#121212] border border-[#444444] mb-2 flex items-center justify-center shadow-xs">
                  <Moon className="w-3 h-3 text-[#94a3b8]" />
                </div>
                <div>
                  <span className="font-semibold text-xs block text-white">Black Theme</span>
                  <span className="text-[10px] text-[#888888]">Classic dark workstation</span>
                </div>
              </button>

              {/* White Theme */}
              <button
                type="button"
                id="theme-white-option"
                onClick={() => onUpdateSettings({ appTheme: 'light' })}
                className={`p-3.5 rounded-lg border text-left flex flex-col justify-between transition-all relative ${
                  isLight
                    ? 'border-accent bg-accent-subtle text-[#0f172a] ring-1 ring-accent'
                    : 'border-[#2d2d2d] bg-[#161616] hover:bg-[#202020] text-[#aaaaaa]'
                }`}
              >
                {isLight && (
                  <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </span>
                )}
                <div className="w-6 h-6 rounded-full bg-[#ffffff] border border-[#cbd5e1] mb-2 flex items-center justify-center shadow-xs">
                  <Sun className="w-3.5 h-3.5 text-[#eab308]" />
                </div>
                <div>
                  <span
                    className={`font-semibold text-xs block ${isLight ? 'text-[#0f172a]' : 'text-white'}`}
                  >
                    White Theme
                  </span>
                  <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#888888]'}`}>
                    Clean, high-contrast light
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Custom Accent Color */}
          <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-[#e2e8f0]' : 'border-[#292929]'}`}>
            <div className="flex items-center justify-between">
              <label
                className={`text-[11px] font-semibold uppercase tracking-wider block ${
                  isLight ? 'text-[#64748b]' : 'text-[#888888]'
                }`}
              >
                Accent Color
              </label>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-[#888888] font-mono">
                  {settings.customAccentColor || '#38bdf8'}
                </span>
                <label className="relative cursor-pointer w-5 h-5 rounded-full border border-white/20 overflow-hidden shrink-0 shadow-xs" title="Custom color picker">
                  <input
                    type="color"
                    value={settings.customAccentColor || '#38bdf8'}
                    onChange={(e) => onUpdateSettings({ customAccentColor: e.target.value })}
                    className="absolute -inset-1 opacity-0 cursor-pointer w-7 h-7"
                  />
                  <span
                    className="block w-full h-full"
                    style={{ backgroundColor: settings.customAccentColor || '#38bdf8' }}
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {ACCENT_PRESETS.map((preset) => {
                const isSelected = (settings.customAccentColor || '#38bdf8').toLowerCase() === preset.color.toLowerCase();
                return (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => onUpdateSettings({ customAccentColor: preset.color })}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                      isSelected ? 'scale-110 ring-2 ring-white/60 shadow-md' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row Density */}
          <div className={`space-y-2 pt-2 border-t ${isLight ? 'border-[#e2e8f0]' : 'border-[#292929]'}`}>
            <label
              className={`text-[11px] font-semibold uppercase tracking-wider block ${
                isLight ? 'text-[#64748b]' : 'text-[#888888]'
              }`}
            >
              Library List Density
            </label>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ rowDensity: 'comfortable' })}
                className={`flex-1 py-2 px-3 rounded-md border text-center transition-colors ${
                  settings.rowDensity === 'comfortable'
                    ? 'border-accent bg-accent-subtle text-accent font-semibold'
                    : isLight
                    ? 'border-[#cbd5e1] bg-[#f8fafc] text-[#475569] hover:bg-[#f1f5f9]'
                    : 'border-[#2e2e2e] bg-[#161616] text-[#aaaaaa] hover:bg-[#222222]'
                }`}
              >
                Comfortable (Standard)
              </button>
              <button
                type="button"
                onClick={() => onUpdateSettings({ rowDensity: 'compact' })}
                className={`flex-1 py-2 px-3 rounded-md border text-center transition-colors ${
                  settings.rowDensity === 'compact'
                    ? 'border-accent bg-accent-subtle text-accent font-semibold'
                    : isLight
                    ? 'border-[#cbd5e1] bg-[#f8fafc] text-[#475569] hover:bg-[#f1f5f9]'
                    : 'border-[#2e2e2e] bg-[#161616] text-[#aaaaaa] hover:bg-[#222222]'
                }`}
              >
                Compact (High Density)
              </button>
            </div>
          </div>

          {/* Auto-Activate on Import */}
          <div
            className={`pt-2 border-t flex items-center justify-between py-1 ${
              isLight ? 'border-[#e2e8f0]' : 'border-[#292929]'
            }`}
          >
            <div>
              <span className={`text-xs font-medium block ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Auto-activate on import
              </span>
              <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
                Automatically mark newly imported local fonts as active
              </span>
            </div>
            <button
              type="button"
              onClick={() => onUpdateSettings({ autoActivateOnImport: !settings.autoActivateOnImport })}
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                settings.autoActivateOnImport
                  ? 'bg-accent'
                  : isLight
                  ? 'bg-[#cbd5e1]'
                  : 'bg-[#333333]'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.autoActivateOnImport ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Window Chrome Controls Toggle */}
          <div
            className={`pt-2 border-t flex items-center justify-between py-1 ${
              isLight ? 'border-[#e2e8f0]' : 'border-[#292929]'
            }`}
          >
            <div>
              <span className={`text-xs font-medium block ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Software-native Window Controls
              </span>
              <span className={`text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
                Show minimize, maximize and close buttons in the in-app top bar
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  showTitleBarControls: settings.showTitleBarControls === false ? true : false,
                })
              }
              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                settings.showTitleBarControls !== false
                  ? 'bg-accent'
                  : isLight
                  ? 'bg-[#cbd5e1]'
                  : 'bg-[#333333]'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  settings.showTitleBarControls !== false ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* About & Version */}
          <div
            className={`pt-2.5 border-t flex items-center justify-between ${
              isLight ? 'border-[#e2e8f0]' : 'border-[#292929]'
            }`}
          >
            <div>
              <span className={`text-xs font-semibold ${isLight ? 'text-[#0f172a]' : 'text-white'}`}>
                Fontier
              </span>
              <span className={`block text-[10px] ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
                Modern Typography and Font Manager
              </span>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 text-[#a0a0a0] border border-white/10">
              v{appVersion}
            </span>
          </div>

          {/* Reset Action */}
          <div
            className={`pt-3 border-t flex items-center justify-between ${
              isLight ? 'border-[#e2e8f0]' : 'border-[#292929]'
            }`}
          >
            <span className={`text-[11px] ${isLight ? 'text-[#64748b]' : 'text-[#777777]'}`}>
              Reset to original factory state
            </span>
            {confirmReset ? (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onResetAllData();
                    setConfirmReset(false);
                    onClose();
                  }}
                  className="px-2 py-1 text-xs bg-[#ef4444] hover:bg-[#dc2626] text-white rounded font-medium transition-colors"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    isLight ? 'bg-[#f1f5f9] text-[#475569]' : 'bg-[#282828] text-[#aaaaaa]'
                  }`}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-2.5 py-1 text-xs text-[#ef4444] hover:bg-[#fee2e2]/20 border border-[#ef4444]/40 rounded transition-colors flex items-center space-x-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Footer & User Attribution */}
        <div
          className={`px-5 py-3 border-t flex items-center justify-between ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#181818] border-[#2a2a2a]'
          }`}
        >
          <div className="text-left select-text">
            <p className="text-[11px] italic text-[#888888] leading-tight">
              &ldquo;honestly, I don&apos;t know anymore&rdquo;
            </p>
            <p className="text-[10px] font-medium text-[#666666] tracking-tight mt-0.5">
              vibecoded by Kubichi
            </p>
          </div>

          <button
            onClick={onClose}
            className={`px-4 py-1.5 text-xs font-medium rounded border transition-colors ${
              isLight
                ? 'bg-[#ffffff] hover:bg-[#f1f5f9] text-[#0f172a] border-[#cbd5e1]'
                : 'bg-[#252525] hover:bg-[#2e2e2e] text-white border-[#383838]'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

