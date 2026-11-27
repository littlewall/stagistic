import {defineConfig} from 'vite-plus';

export default defineConfig({test: {include: [
    'src/mcp/**/*.test.ts',
    'src/lifecycle/**/*.test.ts',
    'src/db/**/*.test.ts',
    'src/files/**/*.test.ts',
    'src/links/**/*.test.ts',
    'src/menu/**/*.test.ts',
    'src/logging/**/*.test.ts',
    'scripts/**/*.test.ts',
]}});
