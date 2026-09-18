import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Button} from './Button';
import styles from './Button.module.css';

describe('Button', () => {
    it('defaults to the primary variant at medium size', () => {
        const markup = renderToStaticMarkup(<Button>Save</Button>);

        expect(markup).toContain(styles.button);
        expect(markup).toContain(styles.primary);
        expect(markup).toContain(styles.md);
    });

    it('composes the ghost variant with the icon size', () => {
        const markup = renderToStaticMarkup(
            <Button
                variant="ghost"
                size="icon"
                aria-label="Menu"
            />,
        );

        expect(markup).toContain(styles.ghost);
        expect(markup).toContain(styles.icon);
        expect(markup).toContain('aria-label="Menu"');
    });

    it('keeps variant and size as distinct classes', () => {
        expect(styles.ghost).not.toBe(styles.icon);
    });

    it('exposes a toggle variant for stable pressed controls', () => {
        const markup = renderToStaticMarkup(
            <Button variant="toggle" aria-pressed>Sharp</Button>,
        );

        expect(markup).toContain(styles.toggle);
        expect(markup).toContain('aria-pressed="true"');
    });

    it('keeps a caller className alongside its own classes', () => {
        const markup = renderToStaticMarkup(<Button className="col-span-2">x</Button>);

        expect(markup).toContain('col-span-2');
        expect(markup).toContain(styles.button);
    });
});
