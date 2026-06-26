import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {
    createRoot, type Root,
} from 'react-dom/client';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';
import {
    page, userEvent,
} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../../context';
import ScriptEditor from '../../../Editor';

type CueTestWindow = Window & {__cueComposeEditor?: Editor | null};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as CueTestWindow).__cueComposeEditor = editor;

        return () => {
            delete (window as CueTestWindow).__cueComposeEditor;
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

const getEditor = () => poll(() => (window as CueTestWindow).__cueComposeEditor ?? null, 'editor instance');

const getStageDirection = (editor: Editor): ScriptNode | undefined => {
    const content = editor.getJSON().content as ScriptNode[] | undefined;

    return content?.find(node => node.attrs?.id === 'sd-1');
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('cue # compose', () => {
    it('turns # + title + Enter into a titled cue at the block end', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#Night');
        await userEvent.keyboard('{Enter}');

        const pill = await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        expect(pill.textContent).toContain('Night');

        const stageDirection = getStageDirection(editor);
        const cueStart = stageDirection?.content?.find(node => node.type === 'cueStart');

        expect(cueStart?.attrs?.title).toBe('Night');
        expect((stageDirection?.content ?? []).some(node => node.type === 'text' && (node.text ?? '').includes('Night'))).toBe(false);
    });

    it('cancels on Escape, leaving no cue and no stray title text', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#Song');
        await userEvent.keyboard('{Escape}');

        await poll(() => document.querySelector('[data-cue-pill]') ? null : true, 'no cue pill');

        const stageDirection = getStageDirection(editor);

        expect((stageDirection?.content ?? []).some(node => node.type === 'text' && (node.text ?? '').includes('Song'))).toBe(false);
    });

    it('cleans up the typed title when the caret moves to another block', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();
        const firstBlock = page.elementLocator(await poll(() => document.querySelector('[data-id="sd-1"]'), 'first block'));

        await firstBlock.click();
        await userEvent.type(firstBlock, '#Half');

        const secondBlock = page.elementLocator(await poll(() => document.querySelector('[data-id="sd-2"]'), 'second block'));

        await secondBlock.click();

        await poll(() => document.querySelector('[data-cue-pill]') ? null : true, 'no cue pill');

        const stageDirection = getStageDirection(editor);

        expect((stageDirection?.content ?? []).some(node => node.type === 'text' && (node.text ?? '').includes('Half'))).toBe(false);
    });

    it('shows an (initially empty) compose pill right after #', async () => {
        renderEditor();

        await getEditor();

        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#');

        const composePill = await poll(() => document.querySelector('[data-cue-compose]'), 'compose pill');

        expect(composePill).toBeTruthy();
    });

    it('Backspace on an empty title cancels the compose and # re-triggers', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#');
        await poll(() => document.querySelector('[data-cue-compose]'), 'compose pill');

        await userEvent.keyboard('{Backspace}');
        await poll(() => document.querySelector('[data-cue-compose]') ? null : true, 'compose cleared');

        await userEvent.type(el, '#');
        await poll(() => document.querySelector('[data-cue-compose]'), 'compose pill again');

        const stageDirection = getStageDirection(editor);

        expect((stageDirection?.content ?? []).some(node => node.type === 'text' && (node.text ?? '').includes('#'))).toBe(false);
    });
});
