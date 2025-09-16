/// <reference types="vite/client" />

declare module 'vite' {
  export interface ServerOptions {
    allowedHosts?: string | string[] | 'all';
  }
  
  export interface UserConfig {
    server?: ServerOptions;
  }
}