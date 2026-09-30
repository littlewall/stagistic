import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {ActionCard} from './ActionCard';
import styles from './ActionCard.module.css';

describe('ActionCard', () => {
    it('renders a button with icon, title and description by default', () => {
        const markup = renderToStaticMarkup(
            <ActionCard
                icon={<svg />}
                title="New script"
                description="Start from scratch"
            />,
        );

        expect(markup).toContain(styles.card);
        expect(markup).toContain(styles.default);
        expect(markup).toContain('New script');
        expect(markup).toContain('Start from scratch');
        expect(markup).toContain('<button');
    });

    it('applies the primary variant', () => {
        const markup = renderToStaticMarkup(
            <ActionCard
                variant="primary"
                icon={<svg />}
                title="Import"
            />,
        );

        expect(markup).toContain(styles.primary);
    });

    it('renders the error slot when given', () => {
        const markup = renderToStaticMarkup(
            <ActionCard
                icon={<svg />}
                title="Import"
                error="File is not valid"
            />,
        );

        expect(markup).toContain(styles.error);
        expect(markup).toContain('File is not valid');
    });

    it('honours the polymorphic as prop', () => {
        const markup = renderToStaticMarkup(
            <ActionCard
                as="a"
                href="/x"
                icon={<svg />}
                title="Open"
            />,
        );

        expect(markup).toContain('<a');
        expect(markup).toContain('href="/x"');
    });
});
