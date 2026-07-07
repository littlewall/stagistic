import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import ScriptEditor from '../Editor';
import {createEditorSurfaceCache, type EditorSurfaceCache} from './editorSurfaceCache';

const createDocument = (): ScriptDocument => ({
    type: 'doc',
    content: Array.from({length: 40}, (_, index) => ({
        type: 'stageDirection',
        attrs: {id: `block-${index}`},
        content: [
            {
                type: 'text',
                text: `Line ${index}: the quick brown fox jumps over the lazy dog.`,
            },
        ],
    })),
});

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean, timeoutMs = 10_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error('Timed out waiting for condition');
};

const mountEditor = (initialValue: ScriptDocument, surfaceCache?: EditorSurfaceCache) => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue,
                persistentCharacters: [],
            }}
            layout={{autoFocus: false}}
            surfaceCache={surfaceCache}
        />,
    );
    mountedRoots.push(root);
};

const unmountAll = () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
};

const editorDom = () => document.querySelector<HTMLElement>('[data-editor]');

afterEach(unmountAll);

describe('editor surface reuse', () => {
    it('re-attaches the same live instance and keeps typed content', async () => {
        const cache = createEditorSurfaceCache();
        const documentValue = createDocument();

        mountEditor(documentValue, cache);
        await waitFor(() => editorDom() !== null);

        const firstDom = editorDom();

        // Type into the live editor so its content diverges from initialValue.
        firstDom?.focus();
        await userEvent.click(firstDom as HTMLElement);
        await userEvent.keyboard('XYZQ');
        await waitFor(() => Boolean(firstDom?.textContent?.includes('XYZQ')));

        unmountAll();

        // The cache keeps the instance alive across the unmount.
        mountEditor(documentValue, cache);
        await waitFor(() => editorDom() !== null);

        const secondDom = editorDom();

        expect(secondDom).toBe(firstDom);
        expect(secondDom?.textContent).toContain('XYZQ');

        cache.destroy();
    });

    it('rebuilds from the initial value without a cache (previous behavior)', async () => {
        const documentValue = createDocument();

        mountEditor(documentValue);
        await waitFor(() => editorDom() !== null);

        const firstDom = editorDom();

        firstDom?.focus();
        await userEvent.click(firstDom as HTMLElement);
        await userEvent.keyboard('XYZQ');
        await waitFor(() => Boolean(firstDom?.textContent?.includes('XYZQ')));

        unmountAll();

        mountEditor(documentValue);
        await waitFor(() => editorDom() !== null);

        const secondDom = editorDom();

        expect(secondDom).not.toBe(firstDom);
        expect(secondDom?.textContent).not.toContain('XYZQ');
    });

    it('rebuilds when the initial content changes (signature miss)', async () => {
        const cache = createEditorSurfaceCache();

        mountEditor(createDocument(), cache);
        await waitFor(() => editorDom() !== null);

        const firstDom = editorDom();

        unmountAll();

        const changedDocument: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'stageDirection',
                    attrs: {id: 'other-block'},
                    content: [{type: 'text', text: 'A different script.'}],
                },
            ],
        };

        mountEditor(changedDocument, cache);
        await waitFor(() => editorDom() !== null);

        const secondDom = editorDom();

        expect(secondDom).not.toBe(firstDom);
        expect(secondDom?.textContent).toContain('A different script.');

        cache.destroy();
    });
});
