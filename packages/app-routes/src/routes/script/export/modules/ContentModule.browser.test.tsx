import '@stagistic/ui/styles/base.css';

import {useState} from 'react';
import {
    createRoot,
    type Root,
} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {ContentModule} from './ContentModule';

const mountedRoots: Root[] = [];

const waitForSwitch = async () => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<HTMLInputElement>('input[role="switch"]');

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Expected Show notes switch to render.');
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('ContentModule', () => {
    it('shows notes by default and emits the disabled value', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);
        const Harness = () => {
            const [showNotes, setShowNotes] = useState(true);

            return (
                <>
                    <ContentModule value={showNotes} onChange={setShowNotes} />
                    <output data-testid="value">{String(showNotes)}</output>
                </>
            );
        };

        document.body.appendChild(host);
        root.render(<Harness />);
        mountedRoots.push(root);

        const notesSwitch = await waitForSwitch();
        const label = notesSwitch.closest('label');

        expect(label?.textContent?.trim()).toBe('Show notes');
        expect(notesSwitch.checked).toBe(true);

        await userEvent.click(label!);

        expect(notesSwitch.checked).toBe(false);
        expect(document.querySelector('[data-testid="value"]')?.textContent).toBe('false');
    });
});
