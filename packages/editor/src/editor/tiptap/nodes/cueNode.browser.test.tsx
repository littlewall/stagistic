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
            type: 'stageDirection', attrs: {id: 'stage-direction-1'}, content: [],
        },
    ],
});

const mountedRoots: Root[] = [];

const renderEditor = () => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor document={{initialValue: createDocument()}} layout={{autoFocus: true}}>
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

        editor.commands.insertCueStart('stage-direction-1', 'Night');

        const pill = await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        expect(pill.textContent).toContain('Night');
    });

    it('inserts an out before a trailing start (close-then-open order)', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('stage-direction-1', 'Night');
        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        editor.commands.insertCueOut('stage-direction-1');
        await poll(() => document.querySelector('[data-cue-pill="out"]'), 'cue out pill');

        const block = document.querySelector('[data-id="stage-direction-1"]');
        const pills = Array.from(block?.querySelectorAll('[data-cue-pill]') ?? []);

        expect(pills.map(pill => pill.getAttribute('data-cue-pill'))).toEqual(['out', 'start']);
    });
});
