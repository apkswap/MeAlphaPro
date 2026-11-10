/// <reference types="vite/client" />

declare global {
  interface Window {
    mealphaDesktop?: {
      openExternal: (url: string) => Promise<void>;
    };
  }
}

export {};
