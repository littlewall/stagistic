import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {StrictMode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import ScriptEditor from './Editor';

const block = (type: string, id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: [{type: 'text', text}],
});

const DOCUMENT: ScriptDocument = {
    type: 'doc',
    content: [
        block('scene', 's1', 'INT. LIGHTHOUSE'),
        block('stageDirection', 'b1', 'The room is dark.'),
        {
            type: 'stageDirection',
            attrs: {id: 'b2'},
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'music-1',
                        mode: 'open',
                        title: 'Night',
                    },
                },
            ],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'b3'},
            content: [{type: 'musicOut'}],
        },
    ],
};

let root: Root | null = null;

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.replaceChildren();
    vi.restoreAllMocks();
});

const mountAndCollectFlushSyncErrors = async (wrapInStrictMode: boolean) => {
    const errors: string[] = [];

    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
        errors.push(args.map(String).join(' '));
    });

    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.append(host);
    root = createRoot(host);

    const editor = <ScriptEditor document={{initialValue: DOCUMENT}} isReadOnly={false} />;

    root.render(wrapInStrictMode ? <StrictMode>{editor}</StrictMode> : editor);

    await vi.waitFor(() => expect(host.querySelector('.ProseMirror')).not.toBeNull());
    await new Promise(resolve => setTimeout(resolve, 300));

    return errors.filter(message => message.includes('flushSync'));
};

describe('editor load', () => {
    it('logs no flushSync error', async () => {
        expect(await mountAndCollectFlushSyncErrors(false)).toEqual([]);
    });

    /*
     * Known, development-only (StrictMode double mount): tiptap 3.19 ReactRenderer
     * calls flushSync in its constructor once the editor is initialised, and the
     * music pill node views are rebuilt inside React's effect phase on the second
     * mount. Fixing it needs a tiptap change; remove `.fails` when upstream does.
     */
    it.fails('logs no flushSync error under StrictMode', async () => {
        expect(await mountAndCollectFlushSyncErrors(true)).toEqual([]);
    });
});
