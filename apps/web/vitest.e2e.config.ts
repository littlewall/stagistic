import {defineConfig} from 'vite-plus/test/config';

// Multi-tab end-to-end tests: Playwright drives a production build (`vp preview`).
export default defineConfig({
    test: {
        include: ['e2e/**/*.e2e.test.ts'],
        testTimeout: 120_000,
        hookTimeout: 120_000,
        fileParallelism: false,
    },
});
