import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {Skeleton} from './Skeleton';
import styles from './Skeleton.module.css';

describe('Skeleton', () => {
    it('defaults to the block shape and is decorative', () => {
        const markup = renderToStaticMarkup(<Skeleton />);

        expect(markup).toContain(styles.skeleton);
        expect(markup).toContain(styles.block);
        expect(markup).toContain('aria-hidden="true"');
    });

    it('applies the requested shape', () => {
        const markup = renderToStaticMarkup(<Skeleton shape="circle" />);

        expect(markup).toContain(styles.circle);
    });

    it('honours the polymorphic as prop', () => {
        const markup = renderToStaticMarkup(<Skeleton as="span" />);

        expect(markup).toContain('<span');
    });
});
