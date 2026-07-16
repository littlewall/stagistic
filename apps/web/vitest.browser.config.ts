import {fileURLToPath} from 'node:url';

import {playwright} from 'vite-plus/test/browser-playwright';
import {defineConfig} from 'vite-plus/test/config';

const pgliteDataPath = fileURLToPath(
    new URL('./node_modules/@electric-sql/pglite/dist/pglite.data', import.meta.url),
);
const pgliteWasmPath = fileURLToPath(
    new URL('./node_modules/@electric-sql/pglite/dist/pglite.wasm', import.meta.url),
);

export default defineConfig({
    optimizeDeps: {
        exclude: ['@electric-sql/pglite'],
    },
    resolve: {
        tsconfigPaths: true,
        alias: [{find: /^@pglite-data/, replacement: pgliteDataPath}, {find: /^@pglite-wasm/, replacement: pgliteWasmPath}],
    },
    test: {
        include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
        testTimeout: 30_000,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{browser: 'chromium'}],
        },
    },
});
