/// <reference types="vite" />

declare module 'vite' {
  export interface ServerOptions {
    allowedHosts?: string | string[] | 'all';
  }
}