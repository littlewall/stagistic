import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
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

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type CueTestWindow = Window & {__cueTestEditor?: Editor | null};

const createStageDirection = (id: string, content: ScriptNode[] = []): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content,
});
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
    content: [createStageDirection('sd-1')],
});

const createTwoBlockDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [createStageDirection('sd-1'), createStageDirection('sd-2')],
});

const createDocumentWithText = (): ScriptDocument => ({
    type: 'doc',
    content: [createStageDirection('sd-1', [{type: 'text', text: 'Lights fade slowly across the empty stage'}])],
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
        const input = pill.querySelector('input');

        expect(input).toBeInstanceOf(HTMLInputElement);
        expect((input as HTMLInputElement).value).toBe('Night');
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

    it('does not grow the stage-direction line height when a cue is inserted', async () => {
        renderEditor(createDocumentWithText());

        const editor = await getEditor();
        const block = await poll(() => document.querySelector('[data-id="sd-1"]'), 'stage direction block');
        const before = (block as HTMLElement).getBoundingClientRect().height;

        expect(editor.commands.insertCueStart('sd-1', 'Night')).toBe(true);
        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        const after = (block as HTMLElement).getBoundingClientRect().height;

        expect(after).toBeCloseTo(before, 0);
    });

    const cueStartAttrs = (editor: Editor): Record<string, unknown> | undefined => {
        const content = editor.getJSON().content as ScriptNode[] | undefined;
        const stageDirection = content?.find(node => node.attrs?.id === 'sd-1');

        return stageDirection?.content?.find(node => node.type === 'cueStart')?.attrs;
    };

    const clickMenuButton = async (label: string) => {
        const button = Array.from(document.querySelectorAll('[data-cue-menu] button'))
            .find(candidate => candidate.getAttribute('aria-label') === label);

        if (!button) {
            throw new Error(`Menu button "${label}" not found`);
        }

        await page.elementLocator(button).click();
    };

    const clickMenuTrigger = async (type: 'start' | 'out') => {
        const trigger = await poll(
            () => document.querySelector(`[data-cue-menu-trigger="${type}"]`),
            'cue menu trigger',
        );

        await page.elementLocator(trigger).click();
    };

    it('activates the pill first, then opens the menu from the trigger and switches open↔hit', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        const pill = await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        await page.elementLocator(pill).click();
        expect(document.querySelector('[data-cue-menu="start"]')).toBeNull();

        await clickMenuTrigger('start');
        await poll(() => document.querySelector('[data-cue-menu="start"]'), 'pill menu');
        await clickMenuButton('Switch cue to hit');

        expect(cueStartAttrs(editor)?.mode).toBe('hit');
    });

    it('edits the cue title inline in the pill', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', '');

        const pill = await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');
        const input = await poll(
            () => pill.querySelector('[data-cue-title-input="start"]'),
            'title input',
        );

        await page.elementLocator(input).click();
        await userEvent.type(page.elementLocator(input), 'Renamed');

        expect(cueStartAttrs(editor)?.title).toBe('Renamed');
    });

    it('keeps an empty confirmed cue title editable without deleting the cue', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        const input = await poll(
            () => document.querySelector<HTMLInputElement>('[data-cue-title-input="start"]'),
            'title input',
        );

        await page.elementLocator(input).click();
        input.setSelectionRange(0, input.value.length);
        await userEvent.keyboard('{Backspace}');

        expect(cueStartAttrs(editor)?.title).toBe('');
        expect(document.querySelector('[data-cue-pill="start"]')).toBeTruthy();
    });

    it('deletes a cue from the menu', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        const pill = await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        await page.elementLocator(pill).click();
        await clickMenuTrigger('start');
        await clickMenuButton('Delete cue');
        await poll(() => document.querySelector('[data-cue-pill="start"]') ? null : true, 'pill removed');

        expect(document.querySelector('[data-cue-pill="start"]')).toBeNull();
    });

    it('does not delete a cue via Backspace', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        editor.commands.focus('end');
        await userEvent.keyboard('{Backspace}');

        expect(document.querySelector('[data-cue-pill="start"]')).toBeTruthy();
    });

    it('keeps a cue when deleting selected stage-direction content around it', async () => {
        renderEditor(createDocumentWithText());

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        const block = editor.state.doc.firstChild;
        const contentEnd = 1 + (block?.content.size ?? 0);

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, contentEnd)));
        await userEvent.keyboard('{Backspace}');

        const content = editor.getJSON().content as ScriptNode[] | undefined;
        const stageDirection = content?.find(node => node.attrs?.id === 'sd-1');

        expect(stageDirection?.content?.map(node => node.type)).toEqual(['cueStart']);
        expect(stageDirection?.content?.[0]?.attrs).toEqual(cueStartAttrs(editor));
        expect(document.querySelector('[data-cue-pill="start"]')).toBeTruthy();
    });
});
