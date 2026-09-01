import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {IconButton} from './IconButton';
import styles from './IconButton.module.css';

describe('IconButton', () => {
    it('defaults to the ghost variant at sm size, neutral tone', () => {
        const markup = renderToStaticMarkup(<IconButton aria-label="Delete" />);

        expect(markup).toContain(styles.iconButton);
        expect(markup).toContain(styles.ghost);
        expect(markup).toContain(styles.sm);
        expect(markup).toContain(styles.neutral);
        expect(markup).toContain('aria-label="Delete"');
    });

    it('composes outline variant, md size, and pill shape', () => {
        const markup = renderToStaticMarkup(
            <IconButton
                variant="outline"
                size="md"
                shape="pill"
                aria-label="Zoom in"
            />,
        );

        expect(markup).toContain(styles.outline);
        expect(markup).toContain(styles.md);
        expect(markup).toContain(styles.pill);
    });

    it('marks the selected state with a data attribute', () => {
        const markup = renderToStaticMarkup(<IconButton isSelected aria-label="Bold" />);

        expect(markup).toContain('data-selected="true"');
    });

    it('applies the danger tone', () => {
        const markup = renderToStaticMarkup(<IconButton tone="danger" aria-label="Remove" />);

        expect(markup).toContain(styles.danger);
    });

    it('keeps a caller className alongside its own classes', () => {
        const markup = renderToStaticMarkup(<IconButton className="col-span-2" aria-label="x" />);

        expect(markup).toContain('col-span-2');
        expect(markup).toContain(styles.iconButton);
    });
});
