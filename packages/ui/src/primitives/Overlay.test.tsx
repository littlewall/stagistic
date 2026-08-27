import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Overlay} from './Overlay';
import styles from './Overlay.module.css';

describe('Overlay', () => {
    it('defaults to bottom placement at popover elevation', () => {
        const markup = renderToStaticMarkup(<Overlay>content</Overlay>);

        expect(markup).toContain(styles.overlay);
        expect(markup).toContain(styles.bottom);
        expect(markup).toContain(styles.popover);
    });

    it('applies placement and elevation independently', () => {
        const markup = renderToStaticMarkup(
            <Overlay placement="right" elevation="canvas">x</Overlay>,
        );

        expect(markup).toContain(styles.right);
        expect(markup).toContain(styles.canvas);
    });
});
