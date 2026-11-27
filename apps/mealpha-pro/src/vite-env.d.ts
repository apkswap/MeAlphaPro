/// <reference types="vite/client" />

declare global {
  interface Window {
    mealphaDesktop?: {
      openExternal: (url: string) => Promise<void>;
      getFullscreen: () => Promise<boolean>;
      setFullscreen: (enabled: boolean) => Promise<boolean>;
    };
  }
}

export {};
