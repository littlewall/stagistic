import '@stagistic/ui/styles/base.css';

import {requireValue} from '@stagistic/shared';
import {AppLayout, FocusVisibilityManager} from '@stagistic/ui';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import ScriptEditor from '../../Editor';

let root: Root | null = null;

const mountEditor = async () => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);
    root = createRoot(host);
    root.render(
        <>
            <FocusVisibilityManager />
            <AppLayout footer={null}>
                <ScriptEditor
                    document={{initialValue: {
                        type: 'doc',
                        content: [
                            {
                                type: 'stageDirection',
                                attrs: {id: 'stage-one'},
                                content: [],
                            },
                        ],
                    }}}
                    layout={{autoFocus: true}}
                    editorZoom={1}
                />
            </AppLayout>
        </>,
    );
    await expect.poll(() => host.querySelector('[contenteditable="true"]')).not.toBeNull();

    const editor = requireValue(host.querySelector<HTMLElement>('[contenteditable="true"]'));

    await expect.poll(() => document.activeElement).toBe(editor);

    return {host, editor};
};

const openGutterMenu = async (host: HTMLElement) => {
    await expect.poll(() => host.querySelector('[data-block-action-trigger="true"]')).not.toBeNull();
    await userEvent.click(requireValue(host.querySelector('[data-block-action-trigger="true"]')));
    await expect.poll(() => host.querySelector('[data-block-action-menu="true"] [role="menuitem"]')).not.toBeNull();

    const item = requireValue(host.querySelector<HTMLElement>('[data-block-action-menu="true"] [role="menuitem"]'));

    await expect.poll(() => document.activeElement).toBe(item);

    return item;
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('editor keyboard navigation visibility', () => {
    it('keeps the ring off after the real editor consumes Tab', async () => {
        const {host, editor} = await mountEditor();

        await userEvent.click(editor);
        await userEvent.tab();
        expect(document.activeElement).toBe(editor);
        expect(document.documentElement.hasAttribute('data-focus-ring-visible')).toBe(false);

        const item = await openGutterMenu(host);

        expect(getComputedStyle(item).outlineStyle).toBe('none');
        expect(getComputedStyle(requireValue(item.querySelector('[data-menu-item-surface]'))).boxShadow).toBe('none');
    });

    it('shows the custom menu indicator after arrows move focus', async () => {
        const {host, editor} = await mountEditor();

        await userEvent.click(editor);

        const first = await openGutterMenu(host);

        await userEvent.keyboard('{ArrowDown}');
        expect(document.activeElement).not.toBe(first);

        const focused = requireValue(document.activeElement);

        expect(getComputedStyle(requireValue(focused.querySelector('[data-menu-item-surface]'))).boxShadow).not.toBe('none');
    });
});
