import '../../../styles/base.css';

import {useRef, useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {FocusVisibilityManager} from '../../layout/FocusVisibilityManager';
import {Select} from '../../molecules/forms/Select/Select';
import {SettingsModal} from './SettingsModal';

let mountedRoot: Root | null = null;

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

const SettingsHarness = () => {
    const [isOpen, setIsOpen] = useState(false);
    const trigger = useRef<HTMLButtonElement>(null);

    return (
        <>
            <button
                ref={trigger}
                type="button"
                onClick={() => setIsOpen(true)}
            >
                Open settings
            </button>
            <SettingsModal
                returnFocus={trigger}
                isOpen={isOpen}
                groups={[
                    {
                        id: 'document',
                        label: 'Document',
                        items: [
                            {
                                id: 'title-page',
                                kind: 'item',
                                label: 'Title page',
                                panelId: 'title-page',
                            },
                        ],
                    },
                ]}
                activePanelId="title-page"
                expandedItemIds={[]}
                onClose={() => setIsOpen(false)}
                onSelectPanel={() => {}}
                onToggleExpand={() => {}}
            >
                <input aria-label="Script title" />
            </SettingsModal>
            <button type="button">Outside action</button>
        </>
    );
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('SettingsModal', () => {
    it('traps focus while open and restores it to the trigger on close', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        mountedRoot = createRoot(host);
        mountedRoot.render(<><FocusVisibilityManager /><SettingsHarness /></>);

        await waitFor(() => document.querySelector('button') !== null);

        const trigger = document.querySelector<HTMLButtonElement>('button');

        await userEvent.click(trigger as HTMLButtonElement);
        await waitFor(() => document.querySelector('dialog[aria-label="Settings"]') !== null);

        const dialog = document.querySelector<HTMLDialogElement>('dialog[aria-label="Settings"]');

        await waitFor(() => dialog?.open === true);

        const activeNavigationItem = dialog?.querySelector<HTMLButtonElement>('button[aria-current="page"]');

        expect(document.activeElement).toBe(activeNavigationItem);
        expect(activeNavigationItem?.textContent).toBe('Title page');

        for (let index = 0; index < 5; index += 1) {
            await userEvent.tab();
            expect(dialog?.contains(document.activeElement)).toBe(true);

            if (index === 0) {
                const styles = window.getComputedStyle(document.activeElement as HTMLElement);

                expect(styles.outlineStyle).toBe('solid');
                expect(styles.outlineWidth).toBe('2px');
                expect(styles.outlineOffset).toBe('2px');
            }
        }

        await userEvent.keyboard('{Escape}');
        await waitFor(() => dialog?.open === false);

        expect(document.activeElement).toBe(trigger);
    });
});

it('renders an interactive accessory beside a settings group heading', async () => {
    const host = document.createElement('div');

    document.body.append(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(
        <SettingsModal
            isOpen
            groups={[
                {
                    id: 'format',
                    label: 'Format',
                    headerAccessory: <button type="button">Custom template</button>,
                    items: [],
                },
            ]}
            activePanelId="page"
            onClose={() => {}}
            onSelectPanel={() => {}}
        ><p>Page format</p>
        </SettingsModal>,
    );
    await expect.poll(() => document.querySelector('aside')?.textContent).toContain('Custom template');
    expect(document.querySelector('aside h3')?.textContent).toBe('Format');
});

it('keeps a long group accessory inside the sidebar and omits a headerless group label', async () => {
    const host = document.createElement('div');

    document.body.append(host);
    mountedRoot = createRoot(host);
    mountedRoot.render(
        <SettingsModal
            isOpen
            groups={[
                {
                    id: 'script',
                    label: 'Script',
                    items: [
                        {
                            id: 'title',
                            kind: 'item',
                            label: 'Title page',
                            panelId: 'title',
                        },
                    ],
                },
                {
                    id: 'format',
                    label: 'Format',
                    headerAccessory: (
                        <Select
                            ariaLabel="Format template"
                            value="long"
                            variant="plain"
                            options={[{value: 'long', label: 'Samuel French / Concord — Manuscript with a very long name'}]}
                            onChange={() => {}}
                        />
                    ),
                    items: [],
                },
                {
                    id: 'danger',
                    items: [
                        {
                            id: 'danger',
                            kind: 'item',
                            label: 'Danger zone',
                            panelId: 'danger',
                        },
                    ],
                },
            ]}
            activePanelId="title"
            onClose={() => {}}
            onSelectPanel={() => {}}
        ><p>Panel</p>
        </SettingsModal>,
    );

    await expect.poll(() => document.querySelector('button[aria-label="Format template"]')).toBeTruthy();

    const sidebar = document.querySelector('aside') as HTMLElement;
    const trigger = document.querySelector('button[aria-label="Format template"]') as HTMLElement;
    const label = [...sidebar.querySelectorAll('h3')].find(heading => heading.textContent === 'Format') as HTMLElement;
    const sidebarRect = sidebar.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const sidebarPaddingRight = Number.parseFloat(window.getComputedStyle(sidebar).paddingRight);

    expect(triggerRect.right).toBeLessThanOrEqual(sidebarRect.right - sidebarPaddingRight + 0.5);
    expect(trigger.querySelector('svg')?.getBoundingClientRect().right).toBeLessThanOrEqual(triggerRect.right);
    expect(triggerRect.left - labelRect.right).toBeGreaterThan(0);
    expect(Math.abs((labelRect.top + labelRect.bottom) / 2 - (triggerRect.top + triggerRect.bottom) / 2)).toBeLessThanOrEqual(1);
    expect(window.getComputedStyle(label).fontWeight).toBe('600');
    expect([...sidebar.querySelectorAll('h3')].map(heading => heading.textContent)).toEqual(['Script', 'Format']);
    expect(sidebar.lastElementChild?.textContent).toBe('Danger zone');
});
