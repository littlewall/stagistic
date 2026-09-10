import {defineConfig} from 'vite-plus';

/*
 * Linting and formatting are owned by eslint (@dvdevcz/eslint) + stylelint
 * (configured in-house under stylelint/), wired in eslint.config.js /
 * stylelint.config.js.
 * vite-plus here only configures the test runner.
 */

export default defineConfig({
    test: {
        include: [
            'apps/**/*.test.{ts,tsx}',
            'apps/**/*.spec.{ts,tsx}',
            'packages/**/*.test.{ts,tsx}',
            'packages/**/*.spec.{ts,tsx}',
        ],
        exclude: [
            '**/node_modules/**',
            '**/.git/**',
            '**/*.browser.{test,spec}.{ts,tsx}',
        ],
    },
});
