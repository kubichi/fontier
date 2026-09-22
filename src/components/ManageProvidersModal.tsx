import React from 'react';
import { X, ExternalLink, Check, Plus, Globe } from 'lucide-react';
import { AVAILABLE_PROVIDERS } from '../data/providersData';

interface ManageProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  enabledProviders: string[];
  onToggleProvider: (providerId: string) => void;
  theme?: 'dark' | 'light';
  counts?: Record<string, number>;
}

export const ManageProvidersModal: React.FC<ManageProvidersModalProps> = ({
  isOpen,
  onClose,
  enabledProviders,
  onToggleProvider,
  theme = 'dark',
  counts = {},
}) => {
  if (!isOpen) return null;

  const isLight = theme === 'light';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md select-none p-4">
      <div
        className={`w-full max-w-xl rounded-xl shadow-2xl overflow-hidden text-xs animate-in fade-in-50 zoom-in-95 duration-150 border flex flex-col max-h-[90vh] ${
          isLight
            ? 'bg-[#ffffff] border-[#cbd5e1] text-[#1e293b]'
            : 'bg-[#1e1e1e] border-[#333333] text-[#d0d0d0]'
        }`}
      >
        {/* Header */}
        <div
          className={`h-12 px-5 border-b flex items-center justify-between shrink-0 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#181818] border-[#2a2a2a]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-accent" />
            <span className="font-semibold text-sm">Font Providers & Foundries</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-md transition-colors ${
              isLight ? 'hover:bg-[#e2e8f0] text-[#64748b]' : 'hover:bg-[#2e2e2e] text-[#888888]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body / Provider List */}
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {AVAILABLE_PROVIDERS.map((provider) => {
            const isEnabled = enabledProviders.includes(provider.id);
            const count = counts[provider.id] || counts[provider.providerKey] || 0;

            return (
              <div
                key={provider.id}
                className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-4 ${
                  isLight
                    ? isEnabled
                      ? 'bg-[#f8fafc] border-[#cbd5e1]'
                      : 'bg-[#fafafa] border-[#e2e8f0] opacity-75'
                    : isEnabled
                    ? 'bg-[#252525] border-[#383838]'
                    : 'bg-[#1a1a1a] border-[#282828] opacity-75'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs">{provider.name}</span>
                    {provider.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/15 text-accent">
                        {provider.badge}
                      </span>
                    )}
                    {provider.isBuiltin && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-600/30 text-neutral-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                    {provider.description}
                  </p>
                  <div className="flex items-center space-x-3 mt-2 text-[10px]">
                    <span className="text-emerald-500 font-medium">✓ {provider.licenseNote}</span>
                    <a
                      href={provider.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:underline flex items-center space-x-0.5"
                    >
                      <span>Visit site</span>
                      <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                    </a>
                  </div>
                </div>

                {/* Toggle Button */}
                <div className="shrink-0 flex flex-col items-end space-y-1">
                  <button
                    onClick={() => onToggleProvider(provider.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-colors ${
                      isEnabled
                        ? 'bg-accent text-white shadow-sm'
                        : isLight
                        ? 'bg-[#e2e8f0] hover:bg-[#cbd5e1] text-[#475569]'
                        : 'bg-[#333333] hover:bg-[#444444] text-[#cccccc]'
                    }`}
                  >
                    {isEnabled ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Enabled</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Enable</span>
                      </>
                    )}
                  </button>
                  {isEnabled && count > 0 && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {count} font{count === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`h-12 px-5 border-t flex items-center justify-between shrink-0 ${
            isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#181818] border-[#2a2a2a]'
          }`}
        >
          <span className="text-[11px] text-neutral-400">
            {enabledProviders.length} active provider{enabledProviders.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-accent text-white font-medium hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
