import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    css: {
        transformer: 'lightningcss',
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
