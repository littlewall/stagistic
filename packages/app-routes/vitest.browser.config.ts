import {playwright} from 'vite-plus/test/browser-playwright';
import {defineConfig} from 'vite-plus/test/config';

export default defineConfig({
    test: {
        include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
        passWithNoTests: true,
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{browser: 'chromium'}],
        },
    },
});
