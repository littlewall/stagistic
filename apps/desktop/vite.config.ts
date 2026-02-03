import {fileURLToPath} from 'node:url';

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const host = process.env.TAURI_DEV_HOST;
const pgliteDataPath = fileURLToPath(
    new URL('./node_modules/@electric-sql/pglite/dist/pglite.data', import.meta.url),
);
const pgliteWasmPath = fileURLToPath(
    new URL('./node_modules/@electric-sql/pglite/dist/pglite.wasm', import.meta.url),
);

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    css: {
        transformer: 'lightningcss',
    },
    optimizeDeps: {
        exclude: ['@electric-sql/pglite'],
    },
    resolve: {
        alias: [{find: /^@pglite-data/, replacement: pgliteDataPath}, {find: /^@pglite-wasm/, replacement: pgliteWasmPath}],
    },
    clearScreen: false,
    server: {
        host: host || true,
        port: 5173,
        strictPort: true,
        hmr: host
            ? {
                protocol: 'ws',
                host,
                port: 5173,
            }
            : undefined,
    },
    build: {
        target: 'es2022',
        outDir: 'dist',
        sourcemap: true,
    },
});
