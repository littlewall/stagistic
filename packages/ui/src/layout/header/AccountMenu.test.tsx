import {renderToStaticMarkup} from 'react-dom/server';
import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {AccountMenuContent} from './AccountMenu';

describe('AccountMenuContent', () => {
    it('contains only the theme mode control', () => {
        const markup = renderToStaticMarkup(
            <AccountMenuContent themeMode="auto" onThemeChange={() => {}} />,
        );

        expect(markup).toContain('aria-label="Theme mode"');
        expect(markup).toContain('aria-label="System theme" aria-pressed="true"');
        expect(markup).toContain('aria-label="Light theme" aria-pressed="false"');
        expect(markup).not.toContain('Account settings');
        expect(markup).not.toContain('Sign out');
    });
});
