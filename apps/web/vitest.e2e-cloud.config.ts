import {defineConfig} from 'vite-plus/test/config';

// Cloud account flows against the local stack (docker-compose.dev.yml) through Caddy.
export default defineConfig({
    test: {
        include: ['e2e/cloud/**/*.cloud.test.ts'],
        testTimeout: 180_000,
        hookTimeout: 180_000,
        fileParallelism: false,
    },
});
