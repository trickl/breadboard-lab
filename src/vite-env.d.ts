/// <reference types="vite/client" />

// Asset module declarations for TypeScript (tsc runs separately from Vite)
// Vite will turn these into URLs at build time.
declare module '*.svg' {
  const src: string;
  export default src;
}
