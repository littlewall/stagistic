import {defineConfig} from 'vite-plus/test/config';

// Assertions read the built site; `moon run marketing:test` builds it first.
export default defineConfig({
    test: {
        include: ['test/**/*.test.ts'],
    },
});
