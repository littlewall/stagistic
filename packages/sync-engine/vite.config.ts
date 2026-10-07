import {defineConfig} from 'vite-plus';

export default defineConfig({
    test: {
        include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
        exclude: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
    },
});
