import '@stagistic/ui/styles/base.css';

import {ALL_FORMAT_TEMPLATES} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {NewScriptModal} from '@stagistic/ui';
import {createRoot} from 'react-dom/client';
import {
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

it('creates a script with the selected template and lock on by default', async () => {
    const host = document.createElement('div');

    document.body.append(host);

    const root = createRoot(host);
    const onCreate = vi.fn(() => Promise.resolve());

    root.render(<NewScriptModal isOpen formatTemplates={ALL_FORMAT_TEMPLATES} onClose={() => {}} onCreate={onCreate} />);
    try {
        await expect.poll(() => document.querySelector('button[aria-label="New script template"]')).toBeTruthy();
        await userEvent.click(requireValue(document.querySelector('button[aria-label="New script template"]')));
        await expect.poll(() => Array.from(document.querySelectorAll('[role="option"]')).find(option => option.textContent === 'Dramatists Guild — Musical')).toBeTruthy();
        await userEvent.click(requireValue(Array.from(document.querySelectorAll('[role="option"]')).find(option => option.textContent === 'Dramatists Guild — Musical')));
        await userEvent.click(requireValue(Array.from(document.querySelectorAll('button')).find(button => button.textContent === 'Create script')));
        expect(onCreate).toHaveBeenCalledWith('', 'multi-act', {templateId: 'dg-musical', lock: true});
    } finally {
        root.unmount();
        host.remove();
    }
});
