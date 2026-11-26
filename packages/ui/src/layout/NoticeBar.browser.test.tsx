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

import {NoticeBar} from './NoticeBar';

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

describe('NoticeBar', () => {
    it('shows the message as plain text with a thin full-width row', async () => {
        render(<NoticeBar message="<b>Update</b> now" actionLabel="Download" onAction={vi.fn()} onHide={vi.fn()} />);
        await settle();

        const bar = requireValue(document.querySelector<HTMLElement>('[aria-label="Notice"]'));

        expect(bar.textContent).toBe('<b>Update</b> nowDownloadHide');
        expect(bar.querySelector('b')).toBeNull();
        expect(bar.getBoundingClientRect().height).toBe(28);
        expect(bar.getBoundingClientRect().width).toBe(document.documentElement.clientWidth);
    });

    it('runs the action and Hide', async () => {
        const onAction = vi.fn();
        const onHide = vi.fn();

        render(<NoticeBar message="Hi" actionLabel="Download" onAction={onAction} onHide={onHide} />);
        await settle();
        await page.getByRole('button', {name: 'Download'}).click();
        expect(onAction).toHaveBeenCalledTimes(1);
        await page.getByRole('button', {name: 'Hide'}).click();
        expect(onHide).toHaveBeenCalledTimes(1);
    });
});
