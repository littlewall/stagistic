import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {ListPanel} from './ListPanel';
import styles from './ListPanel.module.css';

describe('ListPanel', () => {
    it('renders a bordered panel by default with its children', () => {
        const markup = renderToStaticMarkup(<ListPanel><div>row</div></ListPanel>);

        expect(markup).toContain(styles.panel);
        expect(markup).toContain(styles.bordered);
        expect(markup).toContain('row');
    });

    it('drops the border when bordered is false and adds inset', () => {
        const markup = renderToStaticMarkup(<ListPanel bordered={false} inset><div /></ListPanel>);

        expect(markup).not.toContain(styles.bordered);
        expect(markup).toContain(styles.inset);
    });
});
