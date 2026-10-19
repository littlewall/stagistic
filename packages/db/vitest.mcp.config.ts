import {defineConfig} from 'vite-plus';

export default defineConfig({test: {
    include: ['tests/mcp/**/*.test.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    fileParallelism: false,
}});
