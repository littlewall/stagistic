import {defineConfig} from 'vite-plus/test/config';

export default defineConfig({
    test: {
        include: ['src/**/*.{test,spec}.ts'],
    },
});
