export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  copyToClipboard: (text: string) => Promise<boolean>;
  getPlatform: () => Promise<string>;
  getAccentColor: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
