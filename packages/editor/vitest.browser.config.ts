import {BROWSER_TEST_SETUP} from '@stagistic/vite-config/browser-test';
import {playwright} from 'vite-plus/test/browser-playwright';
import {defineConfig} from 'vite-plus/test/config';

export default defineConfig({
    test: {
        include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
        setupFiles: [BROWSER_TEST_SETUP],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            viewport: {width: 1280, height: 800},
            instances: [{browser: 'chromium'}],
        },
    },
});
