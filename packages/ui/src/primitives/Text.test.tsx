import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Text} from './Text';
import styles from './Text.module.css';

describe('Text', () => {
    it('defaults to a body paragraph at the medium step', () => {
        const markup = renderToStaticMarkup(<Text>content</Text>);

        expect(markup).toContain('<p');
        expect(markup).toContain(styles.text);
        expect(markup).toContain(styles.body);
        expect(markup).toContain(styles.sizeMd);
    });

    it('treats variant and size as independent axes', () => {
        const markup = renderToStaticMarkup(
            <Text variant="muted" size="3xl">content</Text>,
        );

        expect(markup).toContain(styles.muted);
        expect(markup).toContain(styles.size3xl);
    });

    it('renders the heading named by `as` without changing its size class', () => {
        const markup = renderToStaticMarkup(
            <Text as="h1" size="4xl">Title</Text>,
        );

        expect(markup).toContain('<h1');
        expect(markup).toContain(styles.size4xl);
    });

    it('renders the eyebrow variant class', () => {
        const markup = renderToStaticMarkup(<Text variant="eyebrow" size="xs">Section</Text>);

        expect(markup).toContain(styles.eyebrow);
    });

    it('adds the truncate class only when asked', () => {
        expect(renderToStaticMarkup(<Text>x</Text>)).not.toContain(styles.truncate);
        expect(renderToStaticMarkup(<Text truncate>x</Text>)).toContain(styles.truncate);
    });
});
