import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import ScriptEditor from '../../../Editor';

const createLongDocument = (): ScriptDocument => ({
    type: 'doc',
    content: Array.from({length: 120}, (_, index) => ({
        type: 'stageDirection',
        attrs: {id: `block-${index}`},
        content: [
            {
                type: 'text',
                text: `Line ${index}: the quick brown fox jumps over the lazy dog repeatedly.`,
            },
        ],
    })),
});

const mountedRoots: Root[] = [];

const waitForElement = async <T extends Element>(selector: string): Promise<T> => {
    const deadline = Date.now() + 1000;

    while (Date.now() < deadline) {
        const element = document.querySelector<T>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Expected element matching ${selector}`);
};

const waitForCount = async (selector: string, minimum: number): Promise<number> => {
    const deadline = Date.now() + 3000;

    while (Date.now() < deadline) {
        const count = document.querySelectorAll(selector).length;

        if (count >= minimum) {
            return count;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 25);
        });
    }

    return document.querySelectorAll(selector).length;
};

const renderEditor = () => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue: createLongDocument(),
                persistentCharacters: [],
            }}
            layout={{autoFocus: true}}
        />,
    );

    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('pagination', () => {
    it('inserts a page-break divider when content overflows a single page', async () => {
        renderEditor();

        await waitForElement('[contenteditable="true"]');

        // The trailing spacer is always present; a divider marks a real page break.
        const dividerCount = await waitForCount('[data-pagination-divider="true"]', 1);

        expect(dividerCount).toBeGreaterThanOrEqual(1);
    });
});
