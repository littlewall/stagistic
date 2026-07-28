import {playwright} from 'vite-plus/test/browser-playwright';
import {defineConfig} from 'vite-plus/test/config';

export default defineConfig({
    test: {
        include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
        browser: {
            enabled: true,
            headless: false,
            provider: playwright(),
            viewport: {width: 1280, height: 800},
            instances: [{browser: 'chromium'}],
        },
    },
});
