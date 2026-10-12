import {defineConfig} from 'vite-plus';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        testTimeout: 20_000,
    },
});
