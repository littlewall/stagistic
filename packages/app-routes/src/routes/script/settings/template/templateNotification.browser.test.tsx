import '@stagistic/ui/styles/base.css';

import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {ModalDialog, ToastProvider} from '@stagistic/ui';
import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {expect, it} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {TemplatePickerModal} from './TemplatePickerModal';

const Harness = () => {
    const [isPickerOpen, setIsPickerOpen] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(true);

    return (
        <ToastProvider>
            <ModalDialog isOpen={isSettingsOpen} ariaLabel="Script settings" onClose={() => setIsSettingsOpen(false)}>
                <p>Script settings</p>
                <button onClick={() => setIsSettingsOpen(false)}>Close settings</button>
            </ModalDialog>
            {isPickerOpen ? (
                <TemplatePickerModal
                    initialId="dg-modern"
                    appliedId={null}
                    current={DEFAULT_EDITOR_SETTINGS}
                    onClose={() => setIsPickerOpen(false)}
                    onApply={() => Promise.resolve()}
                />
            ) : null}
        </ToastProvider>
    );
};

it('keeps the applied notification visible and interactive above Script settings', async () => {
    const host = document.createElement('div');

    document.body.append(host);

    const root = createRoot(host);

    root.render(<Harness />);

    try {
        const apply = () => Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Use Dramatists Guild — Modern');

        await expect.poll(apply).toBeTruthy();
        await userEvent.click(requireValue(apply()));
        await expect.poll(() => document.querySelector('[aria-label="Notifications"]')).toBeTruthy();

        const dismiss = () => requireValue(document.querySelector<HTMLButtonElement>('[aria-label="Dismiss notification"]'));

        await expect.poll(() => {
            const target = dismiss();
            const rect = target.getBoundingClientRect();
            const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);

            return target.contains(hit);
        }).toBe(true);
        expect(document.querySelector('dialog[aria-label="Script settings"]')?.hasAttribute('open')).toBe(true);
        await userEvent.click(requireValue(Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Close settings')));
        await expect.poll(() => dismiss().closest('dialog')).toBeNull();
        await userEvent.click(dismiss());
        await expect.poll(() => document.querySelector('[aria-label="Notifications"]')).toBeNull();
    } finally {
        root.unmount();
        document.body.innerHTML = '';
    }
});
