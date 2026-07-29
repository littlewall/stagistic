/// <reference types="vite/client" />

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
