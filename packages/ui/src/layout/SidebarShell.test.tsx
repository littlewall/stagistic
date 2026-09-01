import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe, expect, it,
} from 'vite-plus/test';

import {SidebarShell} from './SidebarShell';
import styles from './SidebarShell.module.css';

describe('SidebarShell', () => {
    it('renders header title, actions and body', () => {
        const markup = renderToStaticMarkup(
            <SidebarShell title="Structure" actions={<button type="button">+</button>}>
                <div>body</div>
            </SidebarShell>,
        );

        expect(markup).toContain(styles.shell);
        expect(markup).toContain(styles.header);
        expect(markup).toContain(styles.body);
        expect(markup).toContain('Structure');
        expect(markup).toContain('body');
    });

    it('omits the actions container when no actions given', () => {
        const markup = renderToStaticMarkup(<SidebarShell title="X"><div /></SidebarShell>);

        expect(markup).not.toContain(styles.actions);
    });
});
