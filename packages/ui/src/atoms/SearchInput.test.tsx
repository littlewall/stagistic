import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {SearchInput} from './SearchInput';
import styles from './SearchInput.module.css';

describe('SearchInput', () => {
    it('renders a search input with the default md size', () => {
        const markup = renderToStaticMarkup(<SearchInput placeholder="Search scripts" />);

        expect(markup).toContain(styles.field);
        expect(markup).toContain(styles.sizeMd);
        expect(markup).toContain('type="search"');
        expect(markup).toContain('placeholder="Search scripts"');
    });

    it('applies the sm size', () => {
        const markup = renderToStaticMarkup(<SearchInput size="sm" />);

        expect(markup).toContain(styles.sizeSm);
    });

    it('forwards the value', () => {
        const markup = renderToStaticMarkup(<SearchInput value="hamlet" readOnly />);

        expect(markup).toContain('value="hamlet"');
    });
});
