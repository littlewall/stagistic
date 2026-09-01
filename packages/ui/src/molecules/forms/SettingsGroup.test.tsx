import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    PanelHeader,
    SettingRow,
    SettingsGroup,
} from './SettingsGroup';
import styles from './SettingsGroup.module.css';

describe('SettingsGroup', () => {
    it('renders a group wrapper', () => {
        const markup = renderToStaticMarkup(<SettingsGroup><span>x</span></SettingsGroup>);

        expect(markup).toContain(styles.group);
    });

    it('renders a setting row', () => {
        const markup = renderToStaticMarkup(<SettingRow><span>x</span></SettingRow>);

        expect(markup).toContain(styles.row);
    });

    it('renders a panel header with title and description', () => {
        const markup = renderToStaticMarkup(
            <PanelHeader title="Layout" description="Adjust the page." />,
        );

        expect(markup).toContain(styles.panelHeader);
        expect(markup).toContain('Layout');
        expect(markup).toContain('Adjust the page.');
    });

    it('omits the description node when not provided', () => {
        const markup = renderToStaticMarkup(<PanelHeader title="Layout" />);

        expect(markup).not.toContain(styles.panelDescription);
    });
});
