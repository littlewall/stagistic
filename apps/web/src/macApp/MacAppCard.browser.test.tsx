import '@stagistic/ui/styles/base.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {MacAppCard} from './MacAppCard';
import {isMacDesktopBrowser, type NavigatorLike} from './macAppOffer';

const MAC_SAFARI: NavigatorLike = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 0,
};
const MAC_CHROME: NavigatorLike = {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/130.0.0.0 Safari/537.36',
    platform: 'MacIntel',
    maxTouchPoints: 0,
    userAgentData: {platform: 'macOS', mobile: false},
};
const IPAD: NavigatorLike = {
    userAgent: MAC_SAFARI.userAgent,
    platform: 'MacIntel',
    maxTouchPoints: 5,
};
const IPHONE: NavigatorLike = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    platform: 'iPhone',
    maxTouchPoints: 5,
};
const WINDOWS: NavigatorLike = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    platform: 'Win32',
    maxTouchPoints: 0,
    userAgentData: {platform: 'Windows', mobile: false},
};
const LINUX: NavigatorLike = {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0.0.0',
    platform: 'Linux x86_64',
    maxTouchPoints: 0,
    userAgentData: {platform: 'Linux', mobile: false},
};
const ANDROID: NavigatorLike = {
    userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0.0.0 Mobile Safari/537.36',
    platform: 'Linux armv8l',
    maxTouchPoints: 5,
    userAgentData: {platform: 'Android', mobile: true},
};

const roots: Root[] = [];

const mountCard = (environment: NavigatorLike) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.append(host);
    root.render(<MacAppCard environment={environment} />);
    roots.push(root);

    return {host, root};
};

const unmountAll = () => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.replaceChildren();
};

afterEach(() => {
    unmountAll();
    window.localStorage.clear();
});

describe('isMacDesktopBrowser', () => {
    it('accepts desktop browsers on macOS', () => {
        expect(isMacDesktopBrowser(MAC_SAFARI)).toBe(true);
        expect(isMacDesktopBrowser(MAC_CHROME)).toBe(true);
    });

    it('rejects iPadOS, phones and other systems', () => {
        expect(isMacDesktopBrowser(IPAD)).toBe(false);
        expect(isMacDesktopBrowser(IPHONE)).toBe(false);
        expect(isMacDesktopBrowser(ANDROID)).toBe(false);
        expect(isMacDesktopBrowser(WINDOWS)).toBe(false);
        expect(isMacDesktopBrowser(LINUX)).toBe(false);
        expect(isMacDesktopBrowser({})).toBe(false);
    });
});

describe('MacAppCard', () => {
    it('offers the Mac app on a desktop Mac with a download link that opens a new tab', async () => {
        const {host} = mountCard(MAC_CHROME);

        await expect.poll(() => host.querySelector('aside')).not.toBeNull();

        const link = host.querySelector('a');

        expect(host.textContent).toContain('Stagistic for Mac');
        expect(host.textContent).toContain('Automatic backups and a read-only MCP connection.');
        expect(link?.textContent).toBe('Get the Mac app');
        expect(link?.getAttribute('href')).toBe('https://stagistic.com/download');
        expect(link?.getAttribute('target')).toBe('_blank');
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    });

    it.each([
        ['iPadOS', IPAD],
        ['an iPhone', IPHONE],
        ['Windows', WINDOWS],
        ['Linux', LINUX],
    ])('stays hidden on %s', (_name, environment) => {
        const {host} = mountCard(environment);

        expect(host.querySelector('aside')).toBeNull();
        expect(host.textContent).toBe('');
    });

    it('remembers a dismissal across remounts', async () => {
        const first = mountCard(MAC_SAFARI);

        await expect.poll(() => first.host.querySelector('aside')).not.toBeNull();
        await page.elementLocator(requireValue(first.host.querySelector<HTMLButtonElement>('button[aria-label="Dismiss Stagistic for Mac"]'))).click();
        expect(first.host.querySelector('aside')).toBeNull();
        expect(window.localStorage.getItem('stagistic.web.macAppCardDismissed')).toBe('1');

        unmountAll();

        const second = mountCard(MAC_SAFARI);

        expect(second.host.querySelector('aside')).toBeNull();
    });
});
