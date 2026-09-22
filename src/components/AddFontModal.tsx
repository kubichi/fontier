import React, { useState, useRef } from 'react';
import { X, Upload, FolderPlus, Folder, CheckCircle2, AlertCircle, HardDrive } from 'lucide-react';
import { FolderItem, FontItem, FontCategory } from '../types';
import { parseFontFile, parseFontBuffer } from '../utils/fontParser';
import { autoTagFontMetadata } from '../utils/autoTagger';
import { scanDroppedItems, scanDirectoryHandle } from '../utils/fileScanner';

interface AddFontModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  onAddCustomFont: (font: FontItem) => void;
  onAddCustomFonts?: (fonts: FontItem[]) => void;
  onCreateFolder: (name: string) => string;
}

export const AddFontModal: React.FC<AddFontModalProps> = ({
  isOpen,
  onClose,
  folders,
  onAddCustomFont,
  onAddCustomFonts,
  onCreateFolder,
}) => {
  const [activeTab, setActiveTab] = useState<'font' | 'folder'>('font');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(folders[0]?.id || '');
  const [newFolderName, setNewFolderName] = useState('');
  const [fontName, setFontName] = useState('');
  const [fontCategory, setFontCategory] = useState<FontCategory>('Sans Serif');
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const directoryInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const setFilesState = (validFiles: File[], folderHintName?: string) => {
    if (validFiles.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'No valid font files (.ttf, .otf, .woff, .woff2) found.',
      });
      return;
    }

    setSelectedFiles(validFiles);

    if (validFiles.length === 1) {
      const singleFile = validFiles[0];
      const baseName = singleFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const formattedName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
      setFontName(formattedName);

      const auto = autoTagFontMetadata({
        fontName: formattedName,
        fileName: singleFile.name,
      });
      if (auto.suggestedCategory) {
        setFontCategory(auto.suggestedCategory);
      }
      setDetectedTags(auto.tags);
    } else {
      setFontName(folderHintName ? `Folder: ${folderHintName}` : `Import (${validFiles.length} fonts)`);
      setDetectedTags(['Imported']);
    }

    setStatusMessage(null);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer) {
      setIsProcessing(true);
      setProcessProgress('Reading dropped folder structure...');
      try {
        const { files: scanned, folderName } = await scanDroppedItems(e.dataTransfer);
        setFilesState(scanned.map((s) => s.file) as File[], folderName);


      } catch (err) {
        console.warn('Error reading dropped files:', err);
      } finally {
        setIsProcessing(false);
        setProcessProgress('');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const all = Array.from(e.target.files);
      const valid = all.filter((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        return ['ttf', 'otf', 'woff', 'woff2', 'ttc'].includes(ext || '');
      });
      if (valid.length > 10) {
        setStatusMessage({
          type: 'error',
          text: 'Selecting more than 10 individual files directly is limited for performance. Please use "Select Folder" instead to import large collections.',
        });
        e.target.value = '';
        return;
      }
      setFilesState(valid);
    }
    e.target.value = '';
  };

  const handleDirectoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const all = Array.from(e.target.files);
      const valid = all.filter((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase();
        return ['ttf', 'otf', 'woff', 'woff2', 'ttc'].includes(ext || '');
      });
      let folderName = 'Local Folder';
      if (all[0].webkitRelativePath) {
        const parts = all[0].webkitRelativePath.split('/');
        if (parts.length > 1) folderName = parts[0];
      }
      setFilesState(valid, folderName);
    }
    e.target.value = '';
  };

  // Open Native Directory Picker (Electron or Web File System Access)
  const handlePickDirectory = async () => {
    // 1. Electron Native Folder Picker
    if (typeof (window as any).electronAPI?.selectDirectory === 'function') {
      try {
        setIsProcessing(true);
        setProcessProgress('Scanning directory and subfolders...');
        const res = await (window as any).electronAPI.selectDirectory();
        if (res && res.files && res.files.length > 0) {
          const parsedList: FontItem[] = [];
          for (let i = 0; i < res.files.length; i++) {
            const f = res.files[i];
            try {
              const item = await parseFontBuffer(f.name, f.buffer, selectedFolderId || undefined, f.size);
              item.filePath = f.path;
              parsedList.push(item);
            } catch (err) {
              console.warn(`Could not parse ${f.name}:`, err);
            }
          }
          if (parsedList.length > 0) {
            if (onAddCustomFonts) {
              onAddCustomFonts(parsedList);
            } else {
              parsedList.forEach((font) => onAddCustomFont(font));
            }
            onClose();
          }
        }
      } catch (err) {
        console.warn('Electron folder selection error:', err);
      } finally {
        setIsProcessing(false);
        setProcessProgress('');
      }
      return; // Return immediately to prevent opening a second web directory dialog
    }

    // 2. Web File System Access Directory Picker
    if (typeof (window as any).showDirectoryPicker === 'function') {
      try {
        setIsProcessing(true);
        setProcessProgress('Scanning directory tree...');
        const dirHandle = await (window as any).showDirectoryPicker({
          id: 'fontbase-modal-picker',
          mode: 'read',
        });
        const files: File[] = [];
        await scanDirectoryHandle(dirHandle, files);
        setFilesState(files, dirHandle.name);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker fallback:', err);
      } finally {
        setIsProcessing(false);
        setProcessProgress('');
      }
      return;
    }

    // 3. Fallback: webkitdirectory input
    directoryInputRef.current?.click();
  };

  const handleAddFontSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setStatusMessage({ type: 'error', text: 'Please select font files or a folder.' });
      return;
    }

    setIsProcessing(true);
    try {
      const parsedList: FontItem[] = [];
      const BATCH = 20;

      for (let i = 0; i < selectedFiles.length; i += BATCH) {
        const batch = selectedFiles.slice(i, i + BATCH);
        for (const file of batch) {
          try {
            const parsed = await parseFontFile(file, selectedFolderId || undefined);
            if (selectedFiles.length === 1 && fontName.trim() && fontName.trim() !== parsed.name) {
              parsed.name = fontName.trim();
            }
            if (selectedFiles.length === 1) {
              parsed.category = fontCategory;
              if (detectedTags.length > 0) {
                parsed.tags = Array.from(new Set([...(parsed.tags || []), ...detectedTags]));
              }
            }
            parsedList.push(parsed);
          } catch (fileErr) {
            console.warn(`Could not parse ${file.name}:`, fileErr);
          }
        }
        if (selectedFiles.length > 30) {
          setProcessProgress(`Parsing fonts ${Math.min(i + BATCH, selectedFiles.length)} of ${selectedFiles.length}...`);
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (parsedList.length === 0) {
        throw new Error('No fonts could be parsed');
      }

      if (onAddCustomFonts) {
        onAddCustomFonts(parsedList);
      } else {
        parsedList.forEach((f) => onAddCustomFont(f));
      }

      onClose();
    } catch (err) {
      console.error('Failed to load fonts:', err);
      setStatusMessage({
        type: 'error',
        text: 'Could not parse font binary. Please check file format.',
      });
    } finally {
      setIsProcessing(false);
      setProcessProgress('');
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
    <div className="fixed inset-0 z-[100] bg-black/75 flex items-center justify-center p-4 backdrop-blur-md select-none">
      <div className="w-full max-w-lg bg-[#1e1e1e] border border-[#333333] rounded-lg shadow-2xl overflow-hidden text-[#d4d4d4]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2d2d2d] bg-[#1a1a1a]">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-white">Import Fonts & Folders</span>
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
                ? 'border-accent text-white'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Fonts</span>
          </button>
          <button
            onClick={() => setActiveTab('folder')}
            className={`py-2.5 font-medium border-b-2 ml-4 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'folder'
                ? 'border-accent text-white'
                : 'border-transparent text-[#888888] hover:text-[#cccccc]'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>
        </div>

        {/* Hidden inputs */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".ttf,.otf,.woff,.woff2,.ttc"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={directoryInputRef}
          onChange={handleDirectoryInputChange}
          /* @ts-expect-error standard directory attributes */
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
        />

        {/* Body */}
        <div className="p-5">
          {statusMessage && (
            <div
              className={`mb-4 p-2.5 rounded text-xs flex items-center space-x-2 ${
                statusMessage.type === 'error'
                  ? 'bg-red-950/50 border border-red-800 text-red-300'
                  : 'bg-sky-950/50 border border-sky-800 text-sky-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{statusMessage.text}</span>
            </div>
          )}

          {activeTab === 'font' ? (
            <form onSubmit={handleAddFontSubmit} className="space-y-4 text-xs">
              {/* Dropzone with Folder & File Selection Options */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center transition-colors ${
                  isDragging
                    ? 'border-accent bg-accent-subtle'
                    : selectedFiles.length > 0
                    ? 'border-accent-subtle bg-accent-subtle'
                    : 'border-[#383838] bg-[#191919]'
                }`}
              >
                {selectedFiles.length > 0 ? (
                  <div className="flex flex-col items-center space-y-2 text-center">
                    <CheckCircle2 className="w-7 h-7 text-[#22c55e]" />
                    <span className="font-semibold text-white">
                      {selectedFiles.length === 1
                        ? selectedFiles[0].name
                        : `${selectedFiles.length} font files found`}
                    </span>
                    <span className="text-[11px] text-[#888888]">
                      {selectedFiles.length === 1
                        ? `${(selectedFiles[0].size / 1024).toFixed(1)} KB`
                        : `${(selectedFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024)).toFixed(2)} MB total across folders`}
                    </span>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={handlePickDirectory}
                        className="px-2.5 py-1 bg-[#282828] hover:bg-[#333333] text-xs text-[#dddddd] rounded border border-[#444444] transition-colors"
                      >
                        Change Folder
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 bg-[#282828] hover:bg-[#333333] text-xs text-[#dddddd] rounded border border-[#444444] transition-colors"
                      >
                        Select Files
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3 text-center">
                    <Upload className="w-7 h-7 text-[#777777]" />
                    <div className="space-y-0.5">
                      <span className="text-[#cccccc] font-medium block">
                        Drag and drop font folders or files here
                      </span>
                      <span className="text-[11px] text-[#777777] block">
                        Scans all nested subfolders automatically
                      </span>
                    </div>

                    {/* Prominent Action Buttons */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={handlePickDirectory}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-accent-subtle hover:bg-accent/20 text-accent rounded border border-accent/40 font-medium transition-colors cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5" />
                        <span>Select Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-[#e0e0e0] rounded border border-[#404040] transition-colors cursor-pointer"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-[#888888]" />
                        <span>Select Files</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress message during bulk parsing */}
              {isProcessing && (
                <div className="bg-accent-subtle border border-accent/40 text-accent rounded p-2 text-xs flex items-center space-x-2 animate-pulse">
                  <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span>{processProgress || 'Importing and optimizing fonts...'}</span>
                </div>
              )}

              {/* Auto-detected tags pill preview */}
              {detectedTags.length > 0 && (
                <div className="bg-[#141414] border border-[#2b2b2b] rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-[#888888]">
                    Auto-detected tags:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {detectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-subtle text-accent border border-accent-subtle"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Font Name */}
              <div className="space-y-1">
                <label className="block text-[11px] text-[#aaaaaa]">Display Name</label>
                <input
                  type="text"
                  value={fontName}
                  onChange={(e) => setFontName(e.target.value)}
                  placeholder="e.g. Satoshi, Neue Montreal, Custom Pixel"
                  className="w-full bg-[#181818] border border-[#333333] focus:border-accent rounded px-3 py-1.5 text-white focus:outline-none text-xs"
                />
              </div>

              {/* Category & Folder */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-[#aaaaaa]">Category</label>
                  <select
                    value={fontCategory}
                    onChange={(e) => setFontCategory(e.target.value as FontCategory)}
                    className="w-full bg-[#181818] border border-[#333333] focus:border-accent rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
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
                    className="w-full bg-[#181818] border border-[#333333] focus:border-accent rounded px-2.5 py-1.5 text-white focus:outline-none text-xs"
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
                  disabled={isProcessing || selectedFiles.length === 0}
                  className="px-4 py-1.5 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium rounded transition-opacity"
                >
                  {selectedFiles.length > 1
                    ? `Import ${selectedFiles.length} Fonts`
                    : 'Import Font'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-[11px] text-[#aaaaaa]">Folder Name</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Branding 2025, Web Fonts, UI Icons"
                  autoFocus
                  className="w-full bg-[#181818] border border-[#333333] focus:border-accent rounded px-3 py-1.5 text-white focus:outline-none text-xs"
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
                  className="px-4 py-1.5 bg-accent hover:opacity-90 disabled:opacity-50 text-white font-medium rounded transition-opacity"
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
