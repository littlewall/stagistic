import '../../styles/base.css';

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

import {PageContainer} from '../organisms/PageContainer/PageContainer';
import {NoticeBar} from './NoticeBar';

const mountedRoots: Root[] = [];

const render = (node: React.ReactNode, hostWidth?: number) => {
    const host = document.createElement('div');

    if (hostWidth) {
        host.style.width = `${hostWidth}px`;
    }

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

    it('keeps the page-width content in the page column with its action beside the text', async () => {
        render(
            <>
                <NoticeBar message="New version is ready." actionLabel="Click to restart" onAction={vi.fn()} onHide={vi.fn()} width="page" />
                <PageContainer><div data-page-content>Scripts</div></PageContainer>
            </>,
            1916,
        );
        await settle();

        const content = requireValue(document.querySelector('[data-page-content]')).getBoundingClientRect();
        const bar = requireValue(document.querySelector('[aria-label="Notice"]')).getBoundingClientRect();
        const message = requireValue(document.querySelector('[data-notice-inner] span span')).getBoundingClientRect();
        const action = page.getByRole('button', {name: 'Click to restart'}).element().getBoundingClientRect();
        const hide = page.getByRole('button', {name: 'Hide'}).element().getBoundingClientRect();

        expect(bar.width).toBe(1916);
        expect(message.left).toBeCloseTo(content.left, 1);
        expect(hide.right).toBeCloseTo(content.right, 1);
        // The action follows the text instead of sitting beside Hide.
        expect(action.left - message.right).toBeLessThan(20);
    });
});
