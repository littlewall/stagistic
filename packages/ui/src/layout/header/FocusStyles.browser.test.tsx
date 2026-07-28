import '../../../styles/tokens.css';

import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ThemeModeToggle} from './ThemeModeToggle';
import {ViewSwitcher} from './ViewSwitcher';

let mountedRoot: Root | null = null;

const expectFocusRing = (element: HTMLElement) => {
    const styles = window.getComputedStyle(element);

    expect(styles.outlineStyle).toBe('solid');
    expect(styles.outlineWidth).toBe('2px');
    expect(styles.outlineOffset).toBe('2px');
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('Header keyboard focus styles', () => {
    it('shows the shared focus ring on view and theme controls', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        mountedRoot = createRoot(host);
        mountedRoot.render(
            <>
                <ViewSwitcher activeView="editor" onSelectView={() => {}} />
                <ThemeModeToggle themeMode="auto" onChange={() => {}} />
            </>,
        );

        await userEvent.tab();
        expectFocusRing(document.activeElement as HTMLElement);

        await userEvent.tab();
        expectFocusRing(document.activeElement as HTMLElement);

        await userEvent.tab();
        expectFocusRing(document.activeElement as HTMLElement);
    });
});
