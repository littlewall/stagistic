import '../../styles/tokens.css';

import {requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {AppFooter} from './AppFooter';
import {FooterReleaseProvider} from './footerRelease';

const mountedRoots: Root[] = [];

const render = (node: React.ReactNode) => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(node);
    mountedRoots.push(root);
};

const settle = () => new Promise(resolve => window.setTimeout(resolve, 30));

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('AppFooter', () => {
    it('starts with the Release number and a What\'s new link, without a product name or preview wording', async () => {
        const onOpenWhatsNew = vi.fn();

        render(
            <FooterReleaseProvider value={{releaseNumber: '0.2.0', onOpenWhatsNew}}>
                <AppFooter />
            </FooterReleaseProvider>,
        );
        await settle();

        const footer = requireValue(document.querySelector('footer'));
        const start = requireValue(footer.firstElementChild);

        expect(start.textContent).toBe('Release 0.2.0•What\'s new');
        expect(footer.textContent).not.toContain('Stagistic Editor');
        expect(footer.textContent?.toLowerCase()).not.toContain('preview');

        const link = requireValue(start.querySelector('button'));

        expect(link.textContent).toBe('What\'s new');

        await page.elementLocator(link).click();
        expect(onOpenWhatsNew).toHaveBeenCalledTimes(1);
    });

    it('marks What\'s new with a dot only while a Release is unseen', async () => {
        render(
            <FooterReleaseProvider
                value={{
                    releaseNumber: '0.2.0',
                    onOpenWhatsNew: vi.fn(),
                    hasUnseenRelease: true,
                }}
            >
                <AppFooter />
            </FooterReleaseProvider>,
        );
        await settle();

        const link = requireValue(document.querySelector<HTMLButtonElement>('footer button'));

        expect(link.getAttribute('aria-label')).toBe('What\'s new, unread');
        expect(link.querySelector('[data-unseen-dot]')).not.toBeNull();

        mountedRoots.forEach(root => root.unmount());
        mountedRoots.length = 0;
        document.body.innerHTML = '';

        render(
            <FooterReleaseProvider value={{releaseNumber: '0.2.0', onOpenWhatsNew: vi.fn()}}>
                <AppFooter />
            </FooterReleaseProvider>,
        );
        await settle();

        const calmLink = requireValue(document.querySelector<HTMLButtonElement>('footer button'));

        expect(calmLink.getAttribute('aria-label')).toBeNull();
        expect(calmLink.querySelector('[data-unseen-dot]')).toBeNull();
    });

    it('offers a quiet reload while a new version is available', async () => {
        const onReload = vi.fn();

        render(
            <FooterReleaseProvider
                value={{
                    releaseNumber: '0.2.0',
                    onOpenWhatsNew: vi.fn(),
                    update: {
                        message: 'New version is ready.',
                        actionLabel: 'Click to reload',
                        onPress: onReload,
                    },
                }}
            >
                <AppFooter />
            </FooterReleaseProvider>,
        );
        await settle();

        const [whatsNew, reload] = [...document.querySelectorAll<HTMLButtonElement>('footer button')];

        expect(whatsNew.textContent).toBe('What\'s new');
        expect(whatsNew.querySelector('[data-unseen-dot]')).toBeNull();
        // Only the action is the underlined button; the status stays plain text.
        expect(reload.textContent).toBe('Click to reload');
        expect(reload.querySelector('[data-unseen-dot]')).toBeNull();
        expect(document.querySelector('footer')?.textContent).toContain('New version is ready.Click to reload');

        await page.elementLocator(reload).click();
        expect(onReload).toHaveBeenCalledTimes(1);
    });

    it('shows whatever action the update brings', async () => {
        const onPress = vi.fn();

        render(
            <FooterReleaseProvider
                value={{
                    releaseNumber: '1.0.0',
                    onOpenWhatsNew: vi.fn(),
                    update: {
                        message: 'New version is ready.',
                        actionLabel: 'Click to restart',
                        onPress,
                    },
                }}
            >
                <AppFooter />
            </FooterReleaseProvider>,
        );
        await settle();

        const [, action] = [...document.querySelectorAll<HTMLButtonElement>('footer button')];

        expect(action.textContent).toBe('Click to restart');
        await page.elementLocator(action).click();
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('keeps the centre slot and the feedback link', async () => {
        render(
            <FooterReleaseProvider value={{releaseNumber: '0.2.0', onOpenWhatsNew: vi.fn()}}>
                <AppFooter><span>Hint</span></AppFooter>
            </FooterReleaseProvider>,
        );
        await settle();

        expect(document.querySelector('footer')?.textContent).toContain('Hint');
        expect(document.querySelector('a[href="https://feedback.stagistic.com"]')?.textContent).toBe('Feedback & bug reports');
    });

    it('renders only the feedback link without a provider', async () => {
        render(<AppFooter />);
        await settle();

        expect(document.querySelector('footer button')).toBeNull();
        expect(document.querySelector('footer')?.textContent).toBe('Feedback & bug reports');
    });
});
