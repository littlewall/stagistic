import {fileURLToPath} from 'node:url';

import react from '@vitejs/plugin-react';
import {
    defineConfig,
    type PluginOption,
    type ServerOptions,
} from 'vite-plus';

/** Resolve PGlite assets from the consuming app's workspace installation. */
/** `extraPlugins` are for what only one app needs, e.g. the web's `version.json`. */
export const createEditorViteConfig = (configUrl: string, server: ServerOptions, extraPlugins: PluginOption[] = []) => defineConfig({
    plugins: [react(), ...extraPlugins],
    css: {
        transformer: 'lightningcss',
    },
    optimizeDeps: {
        exclude: ['@electric-sql/pglite'],
    },
    resolve: {
        // One Yjs instance across editor, engine and replicas preserves Y type identity.
        dedupe: [
            'yjs',
            'y-protocols',
            'lib0',
        ],
        tsconfigPaths: true,
        alias: [
            {
                find: /^@pglite-data/,
                replacement: fileURLToPath(new URL('./node_modules/@electric-sql/pglite/dist/pglite.data', configUrl)),
            },
            {
                find: /^@pglite-wasm/,
                replacement: fileURLToPath(new URL('./node_modules/@electric-sql/pglite/dist/pglite.wasm', configUrl)),
            },
        ],
    },
    clearScreen: false,
    server,
    build: {
        target: 'es2022',
        outDir: 'dist',
        sourcemap: true,
    },
});
