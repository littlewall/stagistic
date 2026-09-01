import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {ListRow} from './ListRow';
import styles from './ListRow.module.css';

describe('ListRow', () => {
    it('renders a compact row with its children by default', () => {
        const markup = renderToStaticMarkup(<ListRow>Scene 1</ListRow>);

        expect(markup).toContain(styles.row);
        expect(markup).toContain(styles.compact);
        expect(markup).toContain('Scene 1');
    });

    it('renders the library size', () => {
        const markup = renderToStaticMarkup(<ListRow size="library">Hamlet</ListRow>);

        expect(markup).toContain(styles.library);
    });

    it('marks the selected and interactive states', () => {
        const markup = renderToStaticMarkup(<ListRow selected interactive>x</ListRow>);

        expect(markup).toContain(styles.selected);
        expect(markup).toContain(styles.interactive);
        expect(markup).toContain('aria-selected="true"');
    });

    it('renders leading and trailing slots', () => {
        const markup = renderToStaticMarkup(
            <ListRow leading={<span>L</span>} trailing={<span>T</span>}>mid</ListRow>,
        );

        expect(markup).toContain(styles.leading);
        expect(markup).toContain(styles.trailing);
        expect(markup).toContain('L');
        expect(markup).toContain('T');
    });
});
