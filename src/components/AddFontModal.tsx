import React, { useState, useRef } from 'react';
import { X, Upload, FolderPlus, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { FolderItem, FontItem, FontFormat, FontCategory } from '../types';
import { parseFontFile } from '../utils/fontParser';
import { autoTagFontMetadata } from '../utils/autoTagger';

interface AddFontModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  onAddCustomFont: (font: FontItem) => void;
  onCreateFolder: (name: string) => string;
}

export const AddFontModal: React.FC<AddFontModalProps> = ({
  isOpen,
  onClose,
  folders,
  onAddCustomFont,
  onCreateFolder,
}) => {
  const [activeTab, setActiveTab] = useState<'font' | 'folder'>('font');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folders[0]?.id || '');
  const [newFolderName, setNewFolderName] = useState('');
  const [fontName, setFontName] = useState('');
  const [fontCategory, setFontCategory] = useState<FontCategory>('Sans Serif');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!['ttf', 'otf', 'woff', 'woff2'].includes(ext || '')) {
      setStatusMessage({
        type: 'error',
        text: 'Please upload a valid font file (.ttf, .otf, .woff, .woff2)',
      });
      return;
    }

    setFile(selectedFile);
    // Suggest font name from filename without extension
    const baseName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    setFontName(formattedName);

    // Auto-detect metadata tags (italic, bold, mono, serif, etc.)
    const auto = autoTagFontMetadata({
      fontName: formattedName,
      fileName: selectedFile.name,
    });
    if (auto.suggestedCategory) {
      setFontCategory(auto.suggestedCategory);
    }
    setDetectedTags(auto.tags);
    setStatusMessage(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleAddFontSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !fontName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please select a font file and provide a name.' });
      return;
    }

    try {
      const parsed = await parseFontFile(file, selectedFolderId || undefined);
      if (fontName.trim() && fontName.trim() !== parsed.name) {
        parsed.name = fontName.trim();
      }
      parsed.category = fontCategory;
      if (detectedTags.length > 0) {
        parsed.tags = Array.from(new Set([...(parsed.tags || []), ...detectedTags]));
      }
      onAddCustomFont(parsed);
      onClose();
    } catch (err) {
      console.error('Failed to load font:', err);
      setStatusMessage({
        type: 'error',
        text: 'Could not parse font binary. Please check file format.',
      });
    }
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const newId = onCreateFolder(newFolderName.trim());
    setSelectedFolderId(newId);
    setNewFolderName('');
    setActiveTab('font');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-[#1e1e1e] border border-[#333333] rounded-lg shadow-2xl overflow-hidden text-[#d4d4d4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2d2d2d] bg-[#1a1a1a]">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-white">Add to FontBase</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#282828] text-[#888888] hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-[#2a2a2a] bg-[#161616] text-xs px-5">
          <button
            onClick={() => setActiveTab('font')}
            className={`py-2.5 font-medium border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'font'
                ? 'border-[#4ade80] text-white'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Font File</span>
          </button>
          <button
            onClick={() => setActiveTab('folder')}
            className={`py-2.5 font-medium border-b-2 ml-4 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'folder'
                ? 'border-[#4ade80] text-white'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {statusMessage && (
            <div
              className={`mb-4 p-2.5 rounded text-xs flex items-center space-x-2 ${
                statusMessage.type === 'error'
                  ? 'bg-red-950/50 border border-red-800 text-red-300'
                  : 'bg-emerald-950/50 border border-emerald-800 text-emerald-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'font' ? (
            <form onSubmit={handleAddFontSubmit} className="space-y-4 text-xs">
              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-[#4ade80] bg-[#4ade80]/10'
                    : file
                    ? 'border-emerald-600/50 bg-emerald-950/20'
                    : 'border-[#383838] hover:border-[#555555] bg-[#191919]'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".ttf,.otf,.woff,.woff2"
                  className="hidden"
                />
                {file ? (
                  <div className="flex flex-col items-center space-y-1 text-center">
                    <CheckCircle2 className="w-7 h-7 text-[#4ade80]" />
                    <span className="font-semibold text-white">{file.name}</span>
                    <span className="text-[11px] text-[#888888]">
                      {(file.size / 1024).toFixed(1)} KB • Click or drop to replace
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2 text-center">
                    <Upload className="w-7 h-7 text-[#777777]" />
                    <span className="text-[#cccccc] font-medium">
                      Drag and drop your font file here
                    </span>
                    <span className="text-[11px] text-[#777777]">
                      Supports .TTF, .OTF, .WOFF, .WOFF2
                    </span>
                  </div>
                )}
              </div>

              {/* Auto-detected tags pill preview */}
              {detectedTags.length > 0 && (
                <div className="bg-[#141414] border border-[#2b2b2b] rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-[#888888]">
                    Auto-detected system tags:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {detectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1e2e22] text-[#4ade80] border border-[#2d4a34]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Name */}
              <div className="space-y-1">
                <label className="block text-[11px] text-[#aaaaaa]">Font Display Name</label>
                <input
                  type="text"
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  placeholder="e.g. Satoshi, Neue Montreal, Custom Pixel"
                  className="w-full bg-[#181818] border border-[#333333] focus:border-[#4ade80] rounded px-3 py-1.5 text-white focus:outline-none text-xs"
                />
              </div>

              {/* Category & Folder */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-[#aaaaaa]">Category</label>
                  <select
                    value={fontCategory}
                    onChange={(e) => setFontCategory(e.target.value as FontCategory)}
                    className="w-full bg-[#181818] border border-[#333333] focus:border-[#4ade80] rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
                  >
                    <option value="Sans Serif">Sans Serif</option>
                    <option value="Serif">Serif</option>
                    <option value="Slab Serif">Slab Serif</option>
                    <option value="Display">Display</option>
                    <option value="Pixel">Pixel</option>
                    <option value="Monospace">Monospace</option>
                    <option value="Handwriting">Handwriting</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] text-[#aaaaaa]">Target Folder</label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333333] focus:border-[#4ade80] rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
                  >
                    <option value="">(No folder / General)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] text-[#cccccc] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!file || !fontName.trim()}
                  className="px-4 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:pointer-events-none text-black font-semibold rounded transition-colors"
                >
                  Add Font
                </button>
              </div>
            </form>
          ) : (
            /* Folder Creation Tab */
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-[11px] text-[#aaaaaa]">New Folder Name</label>
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Client X Fonts, Logo Design, 8-bit Games"
                  className="w-full bg-[#181818] border border-[#333333] focus:border-[#4ade80] rounded px-3 py-1.5 text-white focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-[#252525] hover:bg-[#2e2e2e] text-[#cccccc] rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-1.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:pointer-events-none text-black font-semibold rounded transition-colors"
                >
                  Create Folder
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
