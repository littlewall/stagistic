import path from 'node:path';

import stylelint from 'stylelint';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
const configFile = path.join(repositoryRoot, 'stylelint.config.js');

const lintSelector = async (selector: string, file: string) => {
    const result = await stylelint.lint({
        code: `${selector} { outline: none; }`,
        codeFilename: path.join(repositoryRoot, file),
        configFile,
        cwd: repositoryRoot,
    });

    return result.results.flatMap(item => item.warnings).filter(warning => warning.rule === 'selector-pseudo-class-disallowed-list' || warning.rule === 'selector-disallowed-list');
};

describe('product focus visibility guard', () => {
    it.each([
        '.button:focus-visible',
        '.button[data-focus-visible]',
        '.button[data-focus-visible = "true"]',
        '.parent:has(input[data-focus-visible])',
    ])('rejects competing focus signal %s', async selector => {
        expect(await lintSelector(selector, 'packages/ui/src/example.module.css')).toHaveLength(1);
    });

    it.each([
        'apps/marketing/src/example.css',
        'apps/docs/src/styles/example.css',
        'docs/example.css',
    ])('allows native focus styling in %s', async file => {
        expect(await lintSelector('.button:focus-visible', file)).toHaveLength(0);
    });

    it.each([
        ':global(:root[data-focus-ring-visible]) .button:focus',
        ':global(:root[data-focus-ring-visible]) .item[data-focused]',
    ])('allows the application signal %s', async selector => {
        expect(await lintSelector(selector, 'packages/editor/src/example.module.css')).toHaveLength(0);
    });
});
