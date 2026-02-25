import {fileURLToPath} from 'node:url';

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

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
        host: true,
        port: 3000,
        strictPort: true,
        hmr: {
            protocol: process.env.VITE_HMR_PROTOCOL || 'ws',
            host: process.env.VITE_HMR_HOST || 'localhost',
            port: process.env.VITE_HMR_PORT ? Number(process.env.VITE_HMR_PORT) : 3000,
            clientPort: process.env.VITE_HMR_CLIENT_PORT
                ? Number(process.env.VITE_HMR_CLIENT_PORT)
                : undefined,
        },
        proxy: {
            '/api': {
                target: process.env.VITE_API_URL || 'http://localhost:4000',
                changeOrigin: true,
            },
        },
    },
    build: {
        target: 'es2022',
        outDir: 'dist',
        sourcemap: true,
    },
});
