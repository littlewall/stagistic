import '../../styles/tokens.css';

import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ScriptSettingsModal} from './ScriptSettingsModal';

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

    return (
        <>
            <button type="button" onClick={() => setIsOpen(true)}>
                Open settings
            </button>
            <ScriptSettingsModal
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
            </ScriptSettingsModal>
            <button type="button">Outside action</button>
        </>
    );
};

afterEach(() => {
    mountedRoot?.unmount();
    mountedRoot = null;
    document.body.innerHTML = '';
});

describe('ScriptSettingsModal', () => {
    it('traps focus while open and restores it to the trigger on close', async () => {
        const host = document.createElement('div');

        document.body.appendChild(host);
        mountedRoot = createRoot(host);
        mountedRoot.render(<SettingsHarness />);

        await waitFor(() => document.querySelector('button') !== null);

        const trigger = document.querySelector<HTMLButtonElement>('button');

        await userEvent.click(trigger as HTMLButtonElement);
        await waitFor(() => document.querySelector(
            'dialog[aria-label="Script settings"]',
        ) !== null);

        const dialog = document.querySelector<HTMLDialogElement>(
            'dialog[aria-label="Script settings"]',
        );

        await waitFor(() => dialog?.open === true);

        const closeButton = dialog?.querySelector<HTMLButtonElement>(
            'button[aria-label="Close settings"]',
        );
        const activeNavigationItem = dialog?.querySelector<HTMLButtonElement>(
            'button[aria-current="page"]',
        );

        expect(document.activeElement).toBe(closeButton);
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
