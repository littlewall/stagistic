import dvdevEslint from '@dvdevcz/eslint';

const withoutParserProject = configs => configs.map(config => {
    const parserOptions = config.languageOptions?.parserOptions;

    if (!parserOptions?.project) {
        return config;
    }

    const restParserOptions = {...parserOptions};

    delete restParserOptions.project;

    return {
        ...config,
        languageOptions: {
            ...config.languageOptions,
            parserOptions: restParserOptions,
        },
    };
});

export default [
    {
        ignores: [
            '.claude/**',
            '.impeccable/**',
            '**/src-tauri/target/**',
            'packages/db/src/migrations.compiled.ts',
            '**/*.d.ts',
            '**/*.d.mts',
            'apps/landing/**',
            /*
             * vite-plus compiles vite.config.ts -> vite.config.js on each run;
             * it is a gitignored build artifact, not a source file.
             */
            'vite.config.js',
        ],
    },
    ...withoutParserProject(dvdevEslint.configs.base),
    ...withoutParserProject(dvdevEslint.configs.react),
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    /*
                     * These tooling files aren't part of any package tsconfig, so they fall
                     * to the default project. There are >8 of them, so raise tseslint's cap.
                     */
                    maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30,
                    allowDefaultProject: [
                        'eslint.config.js',
                        'stylelint.config.js',
                        'apps/desktop/vite.config.ts',
                        'packages/db/scripts/compile-migrations.mjs',
                        'packages/db/vite.config.ts',
                        'packages/editor/vite.config.ts',
                        'packages/script/vite.config.ts',
                        'packages/shared/vite.config.ts',
                        'packages/ui/vite.config.ts',
                        'packages/app-routes/vite.config.ts',
                        'packages/app-core/vite.config.ts',
                        'packages/editor/vitest.browser.config.ts',
                        'packages/editor/vitest.browser.debug.config.ts',
                        'packages/ui/vitest.browser.config.ts',
                        'packages/app-routes/vitest.browser.config.ts',
                        'packages/app-core/vitest.browser.config.ts',
                    ],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
];
