/// <reference types="vite/client" />

import type { DexteriaAPI } from '../main/preload';

declare global {
  interface Window {
    dexteria: DexteriaAPI;
  }
}
