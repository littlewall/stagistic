import {parsePitch} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {page} from 'vite-plus/test/browser';

import {VocalRangeStaff} from './VocalRangeStaff';

const mountedRoots: Root[] = [];

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Expected element matching ${selector}`);
};

describe('VocalRangeStaff controls', () => {
    it('uses toolbar-style icon button groups', async () => {
        const host = document.createElement('div');
        const root = createRoot(host);

        host.style.setProperty('--control-height-sm', '28px');
        document.body.appendChild(host);
        mountedRoots.push(root);
        root.render(
            <VocalRangeStaff
                interactive
                low={parsePitch('C3')}
                high={parsePitch('A4')}
            />,
        );

        const low = await waitForElement<HTMLButtonElement>('[aria-label="Edit low note C3"]');

        await page.elementLocator(low).click();

        const octaveGroup = await waitForElement<HTMLElement>('[role="group"][aria-label="Octave"]');
        const accidentalGroup = await waitForElement<HTMLElement>('[role="group"][aria-label="Accidental"]');
        const buttons = [...octaveGroup.querySelectorAll<HTMLButtonElement>('button'), ...accidentalGroup.querySelectorAll<HTMLButtonElement>('button')];

        expect(buttons).toHaveLength(4);
        buttons.forEach(button => {
            const rect = button.getBoundingClientRect();

            expect(rect.width).toBe(rect.height);
        });
        expect(octaveGroup.querySelectorAll('svg')).toHaveLength(2);
        expect(octaveGroup.textContent?.trim()).toBe('');
    });
});
