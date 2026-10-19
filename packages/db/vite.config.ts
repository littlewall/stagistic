import {defineConfig} from 'vite-plus';

export default defineConfig({
    test: {
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
        /*
         * Files share a worker's modules, so PGlite's WASM and the migrated
         * template (testing/createTestDb) are built once per worker, not per file.
         */
        isolate: false,
        setupFiles: ['src/testing/setupTestDb.ts'],
        restoreMocks: true,
    },
});
