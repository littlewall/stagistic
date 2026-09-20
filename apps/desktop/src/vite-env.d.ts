/// <reference types="vite/client" />

interface ImportMetaEnv {
}

interface ImportMeta {
    readonly env: ImportMetaEnv,
}

// pglite assets, aliased in vite.config.ts.
declare module '@pglite-data?url' {
    const url: string;
    export default url;
}

declare module '@pglite-wasm?url' {
    const url: string;
    export default url;
}

// Virtual imports pulled in from @stagistic/app-routes source (mirrors that
// package's own vite-env.d.ts, which is not part of this app's program).
declare module 'pdfjs-dist/build/pdf.worker.mjs?url' {
    const url: string;
    export default url;
}

declare module '*.stagistic?raw' {
    const source: string;
    export default source;
}

declare module '*.pdf?url' {
    const url: string;
    export default url;
}

declare module '*.pdf?url&no-inline' {
    const url: string;
    export default url;
}
