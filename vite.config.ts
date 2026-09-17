import {defineConfig} from 'vite-plus';

export default defineConfig({
    test: {
        include: ['apps/**/*.test.{ts,tsx}', 'apps/**/*.spec.{ts,tsx}', 'packages/**/*.test.{ts,tsx}', 'packages/**/*.spec.{ts,tsx}'],
        exclude: ['**/node_modules/**', '**/.git/**', '**/*.browser.{test,spec}.{ts,tsx}'],
    },
});
