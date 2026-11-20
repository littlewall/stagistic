import {fileURLToPath} from 'node:url';

import {BROWSER_TEST_SETUP} from '@stagistic/vite-config/browser-test';
import {playwright} from 'vite-plus/test/browser-playwright';
import {defineConfig} from 'vite-plus/test/config';

const pgliteDataPath = fileURLToPath(
    new URL('./node_modules/@electric-sql/pglite/dist/pglite.data', import.meta.url),
);
const pgliteWasmPath = fileURLToPath(
    new URL('./node_modules/@electric-sql/pglite/dist/pglite.wasm', import.meta.url),
);
const browserStorageResetPath = fileURLToPath(new URL('./src/browserStorageReset.ts', import.meta.url));

export default defineConfig({
    optimizeDeps: {
        exclude: ['@electric-sql/pglite'],
    },
    resolve: {
        tsconfigPaths: true,
        dedupe: ['react', 'react-dom'],
        alias: [{find: /^@pglite-data/, replacement: pgliteDataPath}, {find: /^@pglite-wasm/, replacement: pgliteWasmPath}],
    },
    test: {
        include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
        setupFiles: [BROWSER_TEST_SETUP, browserStorageResetPath],
        testTimeout: 30_000,
        /*
         * These tests run the whole app on real PGlite workers. Measured on 11 cores:
         * 10 sessions (the default) take 141 s with single tests near the 30 s limit,
         * 3 sessions take 138 s with the slowest under 20 s. More sessions only slow each other.
         */
        maxWorkers: 3,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{browser: 'chromium'}],
        },
    },
});
