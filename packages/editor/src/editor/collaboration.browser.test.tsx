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
import * as Y from 'yjs';

import ScriptEditor from './Editor';

const FIELD = 'body';
const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean, timeoutMs = 10_000) => {
    const deadline = Date.now() + timeoutMs;

    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error('Timed out waiting for condition');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

/** Seeds a body fragment the way the sync engine does (one Y op per block). */
const seed = (doc: Y.Doc, blocks: Array<[type: string, id: string, text: string]>) => {
    doc.getXmlFragment(FIELD).insert(0, blocks.map(([
        type,
        id,
        text,
    ]) => {
        const element = new Y.XmlElement(type);

        element.setAttribute('id', id);
        element.setAttribute('blockType', type);
        element.insert(0, [new Y.XmlText(text)]);

        return element;
    }));
};

const REMOTE = Symbol('remote');

/** Two replicas exchanging updates directly (stand-in for BroadcastChannel). */
const link = (left: Y.Doc, right: Y.Doc) => {
    left.on('update', (update: Uint8Array, origin: unknown) => origin !== REMOTE && Y.applyUpdate(right, update, REMOTE));
    right.on('update', (update: Uint8Array, origin: unknown) => origin !== REMOTE && Y.applyUpdate(left, update, REMOTE));
    Y.applyUpdate(right, Y.encodeStateAsUpdate(left), REMOTE);
};

const mount = (doc: Y.Doc, initialValue: ScriptDocument) => {
    const host = document.createElement('div');

    host.style.width = '794px';
    host.style.height = '1123px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue,
                collaboration: {document: doc, field: FIELD},
                persistentCharacters: [],
            }}
            layout={{autoFocus: false}}
        />,
    );
    mountedRoots.push(root);

    return host;
};

const editorIn = (host: HTMLElement) => host.querySelector<HTMLElement>('[data-editor]');

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

const BLOCKS: Array<[string, string, string]> = [
    [
        'scene',
        'scene-1',
        'INT. CASTLE',
    ],
    [
        'stageDirection',
        'direction-1',
        'Ghost enters.',
    ],
];
const initialValue: ScriptDocument = {
    type: 'doc',
    content: BLOCKS.map(([
        type,
        id,
        text,
    ]) => ({
        type,
        attrs: {id},
        content: [{type: 'text', text}],
    })),
};

describe('editor bound to a Y.Doc', () => {
    it('renders the doc without rewriting it, and streams typing to another bound editor', async () => {
        const left = new Y.Doc();
        const right = new Y.Doc();

        seed(left, BLOCKS);
        link(left, right);

        const rightUpdates: unknown[] = [];

        right.on('update', (_update: Uint8Array, origin: unknown) => {
            if (origin !== REMOTE) {
                rightUpdates.push(origin);
            }
        });

        const before = Y.encodeStateVector(left);
        const leftHost = mount(left, initialValue);
        const rightHost = mount(right, initialValue);

        await waitFor(() => Boolean(editorIn(leftHost)?.textContent?.includes('Ghost enters.')));
        await waitFor(() => Boolean(editorIn(rightHost)?.textContent?.includes('Ghost enters.')));

        // Mounting (setContent skipped, sanitize no-op) wrote nothing to the shared doc.
        expect(Y.encodeStateVector(left)).toEqual(before);

        const leftEditor = editorIn(leftHost)!;
        const lastParagraph = leftEditor.querySelectorAll('p')[1];

        await userEvent.click(lastParagraph);
        await userEvent.keyboard('{End} Hamlet watches.');

        await waitFor(() => Boolean(editorIn(rightHost)?.textContent?.includes('Ghost enters. Hamlet watches.')));

        // The idle editor only rendered remote changes; its plugins added no ops of their own.
        expect(rightUpdates).toEqual([]);
        expect(left.getXmlFragment(FIELD).toJSON()).toBe(right.getXmlFragment(FIELD).toJSON());
    });

    it('does not repeat character-ref follow-ups for remote edits in character blocks', async () => {
        const left = new Y.Doc();
        const right = new Y.Doc();
        const blocks: Array<[string, string, string]> = [
            [
                'scene',
                'scene-1',
                'INT. CASTLE',
            ],
            [
                'character',
                'character-1',
                'HAM',
            ],
            [
                'dialogue',
                'dialogue-1',
                'To be.',
            ],
        ];

        seed(left, blocks);
        link(left, right);

        const rightUpdates: unknown[] = [];

        right.on('update', (_update: Uint8Array, origin: unknown) => {
            if (origin !== REMOTE) {
                rightUpdates.push(origin);
            }
        });

        const value: ScriptDocument = {
            type: 'doc',
            content: blocks.map(([
                type,
                id,
                text,
            ]) => ({
                type,
                attrs: {id},
                content: [{type: 'text', text}],
            })),
        };
        const leftHost = mount(left, value);
        const rightHost = mount(right, value);

        await waitFor(() => Boolean(editorIn(rightHost)?.textContent?.includes('To be.')));

        const characterParagraph = editorIn(leftHost)!.querySelectorAll('p')[1];

        await userEvent.click(characterParagraph);
        await userEvent.keyboard('{End}LET');

        await waitFor(() => Boolean(editorIn(rightHost)?.textContent?.includes('HAMLET')));
        await new Promise(resolve => window.setTimeout(resolve, 200));

        expect(rightUpdates).toEqual([]);
        expect(left.getXmlFragment(FIELD).toJSON()).toBe(right.getXmlFragment(FIELD).toJSON());
    });
});
