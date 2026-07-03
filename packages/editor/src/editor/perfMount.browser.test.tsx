/**
 * TEMPORARY measurement harness — not a regression test.
 * Quantifies where the editor-mount time goes (instance build vs pagination)
 * for the view-switching investigation. Delete after the investigation.
 */
import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {StrictMode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import ScriptEditor from './Editor';

const BLOCK_COUNT = 500;

const createLargeDocument = (): ScriptDocument => ({
    type: 'doc',
    content: Array.from({length: BLOCK_COUNT}, (_, index) => ({
        type: 'stageDirection',
        attrs: {id: `block-${index}`},
        content: [
            {
                type: 'text',
                text: `Line ${index}: the quick brown fox jumps over the lazy dog repeatedly, then pauses at the footlights.`,
            },
        ],
    })),
});

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean, timeoutMs: number): Promise<void> => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 5);
        });
    }

    throw new Error('Timed out waiting for condition');
};

const waitForStableDividerCount = async (timeoutMs: number): Promise<number> => {
    const deadline = Date.now() + timeoutMs;
    let previous = -1;

    while (Date.now() < deadline) {
        const count = document.querySelectorAll('[data-pagination-divider="true"]').length;

        if (count > 0 && count === previous) {
            return count;
        }

        previous = count;
        await new Promise(resolve => {
            window.setTimeout(resolve, 100);
        });
    }

    throw new Error('Pagination divider count did not stabilize');
};

type MountTimings = {
    editorReadyMs: number,
    paginationStableMs: number,
    dividerCount: number,
};

const mountAndMeasure = async (
    initialValue: ScriptDocument,
    {strictMode = false}: {strictMode?: boolean} = {},
): Promise<MountTimings> => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);
    const start = performance.now();
    const editorElement = (
        <ScriptEditor
            document={{
                initialValue,
                persistentCharacters: [],
            }}
            layout={{autoFocus: false}}
        />
    );

    root.render(strictMode ? <StrictMode>{editorElement}</StrictMode> : editorElement);
    mountedRoots.push(root);

    await waitFor(() => document.querySelector('[contenteditable="true"]') !== null, 30_000);

    const editorReadyMs = performance.now() - start;
    const dividerCount = await waitForStableDividerCount(30_000);
    const paginationStableMs = performance.now() - start;

    return {
        editorReadyMs,
        paginationStableMs,
        dividerCount,
    };
};

const unmountAll = () => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
};

afterEach(unmountAll);

describe('editor mount performance (measurement harness)', () => {
    it('measures first mount and remount timings', {timeout: 120_000}, async () => {
        const documentValue = createLargeDocument();

        const first = await mountAndMeasure(documentValue);

        unmountAll();

        const second = await mountAndMeasure(documentValue);

        unmountAll();

        const third = await mountAndMeasure(documentValue);

        unmountAll();

        const strict = await mountAndMeasure(documentValue, {strictMode: true});

        // eslint-disable-next-line no-console
        console.log(JSON.stringify({
            blockCount: BLOCK_COUNT,
            firstMount: first,
            remount: second,
            remount2: third,
            strictModeMount: strict,
        }, null, 2));

        expect(first.dividerCount).toBeGreaterThan(0);
        expect(second.dividerCount).toBe(first.dividerCount);
    });
});
