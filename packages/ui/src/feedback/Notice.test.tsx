import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {Notice} from './Notice';
import styles from './Notice.module.css';

describe('Notice', () => {
    it('renders the warning variant with a status role', () => {
        const markup = renderToStaticMarkup(<Notice variant="warning">Missing PDFs</Notice>);

        expect(markup).toContain(styles.notice);
        expect(markup).toContain(styles.warning);
        expect(markup).toContain('role="status"');
    });

    it('renders the error variant with an alert role', () => {
        const markup = renderToStaticMarkup(<Notice variant="error">Failed</Notice>);

        expect(markup).toContain(styles.error);
        expect(markup).toContain('role="alert"');
    });

    it('renders the empty variant without a role', () => {
        const markup = renderToStaticMarkup(<Notice variant="empty">No scripts yet</Notice>);

        expect(markup).toContain(styles.empty);
        expect(markup).not.toContain('role=');
    });

    it('lets the caller override the role', () => {
        const markup = renderToStaticMarkup(<Notice variant="warning" role="alert">x</Notice>);

        expect(markup).toContain('role="alert"');
    });
});
