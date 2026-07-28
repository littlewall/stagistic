import '../../styles/tokens.css';

import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    ToastProvider,
    type ToastVariant,
    useToastController,
} from './ToastProvider';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for condition');
};

const ToastSeeder = () => {
    const {addToast} = useToastController();

    useEffect(() => {
        const variants: ToastVariant[] = [
            'success',
            'error',
            'info',
        ];

        variants.forEach(variant => addToast({
            title: variant,
            description: `${variant} description`,
            variant,
        }, {timeout: 60_000}));
    }, [addToast]);

    return null;
};

const renderToasts = () => {
    const host = document.createElement('div');

    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ToastProvider>
            <ToastSeeder />
        </ToastProvider>,
    );
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.documentElement.style.removeProperty('--size-scale');
    document.body.innerHTML = '';
});

describe('ToastProvider', () => {
    it('renders flat status toasts with compact close controls', async () => {
        document.documentElement.style.setProperty('--size-scale', '1');
        renderToasts();

        await waitFor(() => document.querySelectorAll('[data-variant]').length === 3);

        const toasts = Array.from(document.querySelectorAll<HTMLElement>('[data-variant]'));
        const backgrounds = toasts.map(toast => getComputedStyle(toast).backgroundColor);

        expect(new Set(backgrounds).size).toBe(1);
        expect(toasts.every(toast => getComputedStyle(toast).boxShadow === 'none')).toBe(true);
        expect(toasts.every(
            toast => toast.querySelector(':scope > [aria-hidden="true"]') !== null,
        )).toBe(true);

        const closeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>(
            'button[aria-label="Zavřít oznámení"]',
        ));

        expect(closeButtons).toHaveLength(3);
        closeButtons.forEach(button => {
            const buttonStyle = getComputedStyle(button);
            const iconStyle = getComputedStyle(button.querySelector('svg')!);

            expect(buttonStyle.width).toBe('24px');
            expect(buttonStyle.height).toBe('24px');
            expect(iconStyle.width).toBe('12px');
            expect(iconStyle.height).toBe('12px');
        });
    });
});
