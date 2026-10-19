import {defineConfig} from 'vite-plus/test/config';

// Node unit tests only; browser, e2e and cloud suites have their own configs.
export default defineConfig({
    test: {
        include: ['src/**/*.test.{ts,tsx}'],
        exclude: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
    },
});
