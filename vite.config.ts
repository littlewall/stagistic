import lint from '@stagistic/linters/oxlint';
import {defineConfig} from 'vite-plus';

export default defineConfig({
    lint,
    staged: {
        '*.{ts,tsx,js,jsx,mjs,cjs}': ['pnpm exec moon run root:lint-js-fix --', 'pnpm exec moon run root:format --'],
        '*.{css,scss}': 'pnpm exec moon run root:stylelint-fix --',
    },
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
            '**/*.e2e.test.ts',
        ],
    },
});
