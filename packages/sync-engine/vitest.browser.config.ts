import {playwright} from 'vite-plus/test/browser-playwright';
import {defineConfig} from 'vite-plus/test/config';

export default defineConfig({
    // One Yjs instance: a second copy breaks `instanceof` checks and Y type identity.
    resolve: {dedupe: [
        'yjs',
        'y-protocols',
        'lib0',
    ]},
    optimizeDeps: {include: [
        'yjs',
        '@hocuspocus/provider',
        'y-indexeddb',
        'y-protocols/sync',
        '@tiptap/y-tiptap',
    ]},
    test: {
        include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{browser: 'chromium'}],
        },
    },
    define: {
        // Optional: spike server for network tests (docker-compose.bench.yml).
        'import.meta.env.SYNC_SPIKE_URL': JSON.stringify(process.env.SYNC_SPIKE_URL ?? ''),
    },
});
