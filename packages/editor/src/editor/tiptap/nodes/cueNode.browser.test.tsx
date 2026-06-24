import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {
    createRoot, type Root,
} from 'react-dom/client';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type CueTestWindow = Window & {__cueTestEditor?: Editor | null};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as CueTestWindow).__cueTestEditor = editor;

        return () => {
            delete (window as CueTestWindow).__cueTestEditor;
        };
    }, [editor]);

    return null;
};

const createDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection', attrs: {id: 'sd-1'}, content: [],
        },
    ],
});

const createTwoBlockDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection', attrs: {id: 'sd-1'}, content: [],
        }, {
            type: 'stageDirection', attrs: {id: 'sd-2'}, content: [],
        },
    ],
});

const mountedRoots: Root[] = [];

const renderEditor = (initialValue: ScriptDocument = createDocument()) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor document={{initialValue}} layout={{autoFocus: true}}>
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );

    mountedRoots.push(root);
};

const poll = async <T, >(get: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = get();

        if (value) {
            return value;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const getEditor = () => poll(() => (window as CueTestWindow).__cueTestEditor ?? null, 'editor instance');

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('cue pill node views', () => {
    it('renders a cue start pill with its title', async () => {
        renderEditor();

        const editor = await getEditor();

        expect(editor.commands.insertCueStart('sd-1', 'Night')).toBe(true);

        const pill = await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        expect(pill.textContent).toContain('Night');
    });

    it('allows at most one cue atom per stage direction block', async () => {
        renderEditor();

        const editor = await getEditor();

        expect(editor.commands.insertCueStart('sd-1', 'Night')).toBe(true);
        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        expect(editor.commands.insertCueStart('sd-1', 'Second')).toBe(false);
        expect(editor.commands.insertCueOut('sd-1')).toBe(false);

        const block = document.querySelector('[data-id="sd-1"]');

        expect(block?.querySelectorAll('[data-cue-pill]').length).toBe(1);
    });

    it('inserts an out into its own empty block', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        expect(editor.commands.insertCueOut('sd-2')).toBe(true);

        const out = await poll(
            () => document.querySelector('[data-id="sd-2"] [data-cue-pill="out"]'),
            'cue out pill',
        );

        expect(out.getAttribute('data-cue-pill')).toBe('out');
    });
});
