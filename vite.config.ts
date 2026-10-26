import lint from '@stagistic/linters/oxlint';
import {defineConfig} from 'vite-plus';

export default defineConfig({
    lint,
    staged: {
        '*.{ts,tsx,js,jsx,mjs,cjs}': ['pnpm exec moon run root:lint-js-fix --', 'pnpm exec moon run root:format --'],
        '*.{css,scss}': 'pnpm exec moon run root:stylelint-fix --',
    },
    test: {
        /*
         * Each project keeps its own include/timeouts, same as `moon run <project>:test`.
         * Browser, e2e, cloud and marketing suites run through their own moon tasks.
         */
        projects: [
            'packages/*/vite.config.ts',
            'apps/web/vitest.config.ts',
            'apps/desktop/vitest.config.ts',
        ],
    },
});
