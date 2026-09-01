import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Stack} from './Stack';
import styles from './Stack.module.css';

describe('Stack', () => {
    it('defaults to a column with medium gap', () => {
        const markup = renderToStaticMarkup(<Stack>content</Stack>);

        expect(markup).toContain(styles.stack);
        expect(markup).toContain(styles.column);
        expect(markup).toContain(styles.gapMd);
        expect(markup).toContain('content');
    });

    it('applies direction, gap, align and justify as classes', () => {
        const markup = renderToStaticMarkup(
            <Stack
                direction="row"
                gap="xl"
                align="center"
                justify="between"
            >
                content
            </Stack>,
        );

        expect(markup).toContain(styles.row);
        expect(markup).toContain(styles.gapXl);
        expect(markup).toContain(styles.alignCenter);
        expect(markup).toContain(styles.justifyBetween);
    });

    it('renders the element named by `as` and keeps a caller className', () => {
        const markup = renderToStaticMarkup(
            <Stack as="ul" className="col-span-2">content</Stack>,
        );

        expect(markup).toContain('<ul');
        expect(markup).toContain('col-span-2');
    });
});
