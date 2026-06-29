import '@stagistic/ui/styles/base.css';

import type {
    ScriptDocument,
    ScriptNode,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {
    createRoot,
    type Root,
} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {findScriptBlockByIdFromState} from '../../tiptap/scriptCore';

type BlockActionTestWindow = Window & {__blockActionTestEditor?: Editor | null};

const stageDirection = (id: string): ScriptNode => ({
    type: 'stageDirection',
    attrs: {id},
    content: [],
});

const createDocument = (blockCount = 1): ScriptDocument => ({
    type: 'doc',
    content: Array.from({length: blockCount}, (_, index) => stageDirection(`sd-${index + 1}`)),
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as BlockActionTestWindow).__blockActionTestEditor = editor;

        return () => {
            delete (window as BlockActionTestWindow).__blockActionTestEditor;
        };
    }, [editor]);

    return null;
};

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

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const getEditor = () => poll(
    () => (window as BlockActionTestWindow).__blockActionTestEditor ?? null,
    'editor instance',
);

const focusBlock = (editor: Editor, blockId: string) => {
    const block = findScriptBlockByIdFromState(editor.state, blockId);

    if (!block) {
        throw new Error(`Block "${blockId}" not found`);
    }

    editor.view.dispatch(
        editor.state.tr.setSelection(TextSelection.create(editor.state.doc, block.from)),
    );
    editor.commands.focus();
};

const getActionTrigger = (blockId: string) => poll(
    () => document.querySelector<HTMLButtonElement>(
        `[data-block-action-trigger="true"][data-block-id="${blockId}"]`,
    ),
    `action trigger for ${blockId}`,
);

const openActionMenu = async (blockId: string) => {
    const trigger = await getActionTrigger(blockId);

    await page.elementLocator(trigger).click();

    return poll(
        () => document.querySelector<HTMLElement>('[data-block-action-menu="true"]'),
        'block action menu',
    );
};

const findMenuItem = (label: string) => {
    return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
        .find(item => item.textContent?.trim() === label) ?? null;
};

const openCuesSubmenu = async () => {
    const cuesItem = await poll(() => findMenuItem('Cues'), 'Cues item');

    await page.elementLocator(cuesItem).hover();

    return cuesItem;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('block action menu', () => {
    it('opens Cues in a submenu and adds an editable cue', async () => {
        renderEditor();

        await getEditor();
        await openActionMenu('sd-1');
        await openCuesSubmenu();

        const addCue = await poll(() => findMenuItem('Add cue'), 'Add cue item');

        await page.elementLocator(addCue).click();

        const input = await poll(
            () => document.querySelector<HTMLInputElement>(
                '[data-id="sd-1"] [data-cue-title-input="start"]',
            ),
            'new cue title input',
        );

        expect(document.activeElement).toBe(input);
        expect(document.querySelector('[data-block-action-trigger="true"]')).toBeNull();
    });

    it('shows Add out with the live open-cue title and inserts the out', async () => {
        renderEditor(createDocument(2));

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        focusBlock(editor, 'sd-2');
        await openActionMenu('sd-2');
        await openCuesSubmenu();

        const addOut = await poll(
            () => findMenuItem('Add out (Night)'),
            'Add out item',
        );

        await page.elementLocator(addOut).click();

        expect(document.querySelector('[data-id="sd-2"] [data-cue-pill="out"]')).toBeTruthy();
    });

    it('uses the cue number when an open cue has no title', async () => {
        renderEditor(createDocument(2));

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', '');
        focusBlock(editor, 'sd-2');
        await openActionMenu('sd-2');
        await openCuesSubmenu();

        expect(await poll(
            () => findMenuItem('Add out (Cue 1)'),
            'untitled Add out item',
        )).toBeTruthy();
    });

    it('does not offer Add out for a hit cue', async () => {
        renderEditor(createDocument(2));

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Hit', 'hit');
        focusBlock(editor, 'sd-2');
        await openActionMenu('sd-2');
        await openCuesSubmenu();

        expect(findMenuItem('Add cue')).toBeTruthy();
        expect(findMenuItem('Add out (Hit)')).toBeNull();
    });

    it('supports keyboard submenu navigation and restores trigger focus', async () => {
        renderEditor();

        await getEditor();

        const trigger = await getActionTrigger('sd-1');

        trigger.focus();
        await userEvent.keyboard('{Enter}');

        const cuesItem = await poll(() => findMenuItem('Cues'), 'Cues item');

        expect(document.activeElement).toBe(cuesItem);

        await userEvent.keyboard('{ArrowRight}');

        const addCue = await poll(() => findMenuItem('Add cue'), 'Add cue item');

        expect(document.activeElement).toBe(addCue);

        await userEvent.keyboard('{Escape}');
        await poll(
            () => document.querySelector('[data-block-action-menu="true"]') ? null : true,
            'closed action menu',
        );

        expect(document.activeElement).toBe(trigger);
    });

    it('closes the submenu when the pointer leaves its parent and panel', async () => {
        renderEditor();

        await getEditor();
        await openActionMenu('sd-1');
        await openCuesSubmenu();
        await poll(
            () => document.querySelector('[data-block-submenu-panel="cues"]'),
            'Cues submenu',
        );

        const typeTrigger = document.querySelector<HTMLElement>('[data-block-actions-trigger="true"]');

        if (!typeTrigger) {
            throw new Error('Block type trigger not found');
        }

        await page.elementLocator(typeTrigger).hover();

        expect(document.querySelector('[data-block-submenu-panel="cues"]')).toBeNull();
    });

    it('preserves the native contextmenu event', async () => {
        renderEditor();

        await getEditor();

        const block = await poll(
            () => document.querySelector<HTMLElement>('[data-id="sd-1"]'),
            'stage direction block',
        );
        const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
        });

        block.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});
