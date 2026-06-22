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
        ],
    },
    ...withoutParserProject(dvdevEslint.configs.base),
    ...withoutParserProject(dvdevEslint.configs.react),
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: [
                        'eslint.config.js',
                        'stylelint.config.js',
                        'apps/desktop/vite.config.ts',
                        'packages/db/scripts/compile-migrations.mjs',
                        'packages/db/vite.config.ts',
                        'packages/editor/vite.config.ts',
                        'packages/script/vite.config.ts',
                        'packages/editor/vitest.browser.config.ts',
                        'packages/editor/vitest.browser.debug.config.ts',
                    ],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
];
