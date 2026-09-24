import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, describe, expect, it, vi} from 'vite-plus/test';
import {page, userEvent} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import type {EditorProps} from '../../contracts';
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

type RenderEditorOptions = {
    document?: Partial<Omit<EditorProps['document'], 'initialValue'>>;
    callbacks?: EditorProps['callbacks'];
};

/*
 * These specs never loaded tokens.css, so the editor's old read of the UI density
 * coefficient fell back to 1. editorZoom={1} states that explicitly now that the
 * value is a prop rather than an ambient global.
 */
const renderEditor = (initialValue: ScriptDocument = createDocument(), options: RenderEditorOptions = {}) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{
                initialValue,
                ...options.document,
            }}
            callbacks={options.callbacks}
            layout={{autoFocus: true}}
            editorZoom={1}
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    mountedRoots.push(root);
};

const poll = async <T,>(get: () => T | null | undefined, label: string): Promise<T> => {
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

const getEditor = () => poll(() => (window as BlockActionTestWindow).__blockActionTestEditor ?? null, 'editor instance');

const focusBlock = (editor: Editor, blockId: string) => {
    const block = findScriptBlockByIdFromState(editor.state, blockId);

    if (!block) {
        throw new Error(`Block "${blockId}" not found`);
    }

    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, block.from)));
    editor.commands.focus();
};

const getActionTrigger = (blockId: string) =>
    poll(() => document.querySelector<HTMLButtonElement>(`[data-block-action-trigger="true"][data-block-id="${blockId}"]`), `action trigger for ${blockId}`);

const openActionMenu = async (blockId: string) => {
    const trigger = await getActionTrigger(blockId);

    await page.elementLocator(trigger).click();

    return poll(() => document.querySelector<HTMLElement>('[data-block-action-menu="true"]'), 'block action menu');
};

const findMenuItem = (label: string) => {
    return (
        Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find(item => {
            const accessibleLabel = item.getAttribute('aria-label') ?? item.textContent?.trim();

            return accessibleLabel === label || accessibleLabel?.startsWith(`${label} `);
        }) ?? null
    );
};

const openMusicSubmenu = async () => {
    const musicItem = await poll(() => findMenuItem('Music'), 'Music item');

    await page.elementLocator(musicItem).hover();

    return musicItem;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('block action menu', () => {
    it('opens Music in a submenu and adds an editable music', async () => {
        renderEditor();

        await getEditor();
        await openActionMenu('sd-1');
        await openMusicSubmenu();

        const addMusic = await poll(() => findMenuItem('Start new music'), 'Start new music item');

        await page.elementLocator(addMusic).click();

        const input = await poll(() => document.querySelector<HTMLElement>('[data-id="sd-1"] [data-music-title-input="start"]'), 'new music title input');

        expect(document.activeElement).toBe(input);
        expect(document.querySelector('[data-music-number]')?.textContent).toBe('0)');
        // Every block keeps "Add comment", so the trigger stays; the menu itself must close.
        expect(document.querySelector('[data-block-action-menu="true"]')).toBeNull();
    });

    it('suggests and assigns an unassigned music from a new music pill', async () => {
        const onMusicAssigned = vi.fn();

        renderEditor(createDocument(), {
            document: {
                persistentMusic: [
                    {
                        id: 'music-overture',
                        title: 'Overture',
                        kind: 'instrumental',
                        assignmentLabel: null,
                    },
                    {
                        id: 'music-finale',
                        title: 'Finale',
                        kind: 'song',
                        assignmentLabel: null,
                    },
                    ...Array.from({length: 9}, (_, index) => ({
                        id: `music-${index + 1}`,
                        title: `Music ${index + 1}`,
                        kind: 'song' as const,
                        assignmentLabel: null,
                    })),
                ],
            },
            callbacks: {onMusicAssigned},
        });

        const editor = await getEditor();

        await openActionMenu('sd-1');
        await openMusicSubmenu();

        const addMusic = await poll(() => findMenuItem('Start new music'), 'Start new music item');

        await page.elementLocator(addMusic).click();

        const input = await poll(() => document.querySelector<HTMLElement>('[data-music-draft="true"]'), 'draft music title input');
        const listbox = await poll(() => document.querySelector<HTMLElement>('[role="listbox"][aria-label="Music suggestions"]'), 'music suggestions');

        expect(listbox.textContent).toContain('Overture');
        expect(listbox.textContent).toContain('Finale');
        expect(listbox.textContent).toContain('Music 9');

        await userEvent.type(input, 'Over');
        await poll(() => (listbox.textContent?.includes('Overture') && !listbox.textContent.includes('Finale') ? true : null), 'filtered music suggestions');
        await userEvent.keyboard('{ArrowDown}{Enter}');

        const musicStart = editor.getJSON().content?.[0]?.content?.find(node => node.type === 'musicStart') as ScriptNode | undefined;

        expect(musicStart?.attrs).toMatchObject({
            musicId: 'music-overture',
            title: 'Overture',
            kind: 'instrumental',
            draft: false,
        });
        expect(onMusicAssigned).toHaveBeenCalledWith('music-overture');
        expect(document.querySelector('[data-music-draft="true"]')).toBeNull();
    });

    it('uses range, start, and emphasized endpoint music icons', async () => {
        renderEditor(createDocument(2));

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        focusBlock(editor, 'sd-2');
        await openActionMenu('sd-2');

        const music = await openMusicSubmenu();
        const addMusic = await poll(() => findMenuItem('Start new music'), 'Start new music item');
        const addOut = await poll(() => findMenuItem('Set music end (0) Night'), 'Set music end item');

        expect(music.querySelector('[data-music-icon="range"]')).toBeTruthy();
        expect(addMusic.querySelector('[data-music-point="start"][data-music-point-style="hollow"]')).toBeTruthy();
        expect(addOut.querySelector('[data-music-point="end"][data-music-point-style="hollow"]')).toBeTruthy();
    });

    it('shows Set music end with the live open-music title and inserts the out', async () => {
        renderEditor(createDocument(2));

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        focusBlock(editor, 'sd-2');
        await openActionMenu('sd-2');
        await openMusicSubmenu();

        const addOut = await poll(() => findMenuItem('Set music end (0) Night'), 'Set music end item');

        await page.elementLocator(addOut).click();

        expect(document.querySelector('[data-id="sd-2"] [data-music-pill="out"]')).toBeTruthy();
    });

    it('uses the music number when an open music has no title', async () => {
        renderEditor(createDocument(2));

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', '');
        focusBlock(editor, 'sd-2');
        await openActionMenu('sd-2');
        await openMusicSubmenu();

        expect(await poll(() => findMenuItem('Set music end (0)'), 'untitled Set music end item')).toBeTruthy();
    });

    it('does not offer a music end command for a hit music', async () => {
        renderEditor(createDocument(2));

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Hit', 'hit');
        focusBlock(editor, 'sd-2');
        await openActionMenu('sd-2');
        await openMusicSubmenu();

        expect(findMenuItem('Start new music')).toBeTruthy();
        expect(findMenuItem('Set music end')).toBeNull();
    });

    it('supports keyboard submenu navigation and restores trigger focus', async () => {
        renderEditor();

        await getEditor();
        await poll(() => (document.activeElement?.matches('[data-editor="true"]') ? true : null), 'editor autofocus');

        const trigger = await getActionTrigger('sd-1');

        trigger.focus();
        trigger.dispatchEvent(
            new KeyboardEvent('keydown', {
                key: 'Enter',
                bubbles: true,
                cancelable: true,
            }),
        );

        const musicItem = await poll(() => findMenuItem('Music'), 'Music item');

        await poll(() => (document.activeElement === musicItem ? musicItem : null), 'Music item focus');

        /*
         * The pointer rests where the previous test left it, which can land on
         * "Add comment" and steal focus by hover. Park it on the focused item.
         */
        await page.elementLocator(musicItem).hover();
        musicItem.focus();
        await userEvent.keyboard('{ArrowRight}');

        const addMusic = await poll(() => findMenuItem('Start new music'), 'Start new music item');

        expect(document.activeElement).toBe(addMusic);

        await userEvent.keyboard('{Escape}');
        await poll(() => (document.querySelector('[data-block-action-menu="true"]') ? null : true), 'closed action menu');

        /*
         * The gutter remounts its trigger while the menu is open, so identity
         * with the node captured above is not something the menu can promise —
         * only that focus lands back on the live trigger for this block rather
         * than falling to <body>.
         */
        const activeElement = document.activeElement;

        expect(activeElement).not.toBe(document.body);
        expect(activeElement?.matches('[data-block-action-trigger="true"][data-block-id="sd-1"]')).toBe(true);
    });

    it('closes the submenu when the pointer leaves its parent and panel', async () => {
        renderEditor();

        await getEditor();
        await openActionMenu('sd-1');
        await openMusicSubmenu();
        await poll(() => document.querySelector('[data-block-submenu-panel="music"]'), 'Music submenu');

        const typeTrigger = document.querySelector<HTMLElement>('[data-block-actions-trigger="true"]');

        if (!typeTrigger) {
            throw new Error('Block type trigger not found');
        }

        await page.elementLocator(typeTrigger).hover();

        expect(document.querySelector('[data-block-submenu-panel="music"]')).toBeNull();
    });

    it('extends the menu-item hit target to the panel edge while keeping its surface inset', async () => {
        renderEditor();

        await getEditor();

        const menu = await openActionMenu('sd-1');
        const musicItem = await poll(() => findMenuItem('Music'), 'Music item');
        const panel = menu.querySelector<HTMLElement>('[data-block-menu-panel="primary"]');
        const surface = musicItem.querySelector<HTMLElement>('[data-menu-item-surface]');

        if (!panel || !surface) {
            throw new Error('Menu panel or item surface not found');
        }

        const panelRect = panel.getBoundingClientRect();
        const itemRect = musicItem.getBoundingClientRect();
        const surfaceRect = surface.getBoundingClientRect();

        expect(itemRect.left).toBeCloseTo(panelRect.left, 1);
        expect(itemRect.right).toBeCloseTo(panelRect.right, 1);
        expect(surfaceRect.left).toBeGreaterThan(itemRect.left);
        expect(surfaceRect.right).toBeLessThan(itemRect.right);
    });

    it('keeps the action trigger and anchored menu stationary after opening', async () => {
        renderEditor();

        await getEditor();

        const trigger = await getActionTrigger('sd-1');
        const typeTrigger = await poll(() => document.querySelector<HTMLButtonElement>('[data-block-actions-trigger="true"]'), 'block type trigger');

        expect(window.getComputedStyle(trigger).transitionDuration).toBe(window.getComputedStyle(typeTrigger).transitionDuration);

        const menu = await openActionMenu('sd-1');
        const triggerRect = trigger.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();

        await new Promise(resolve => window.setTimeout(resolve, 180));

        const settledTriggerRect = trigger.getBoundingClientRect();
        const settledMenuRect = menu.getBoundingClientRect();

        expect(settledTriggerRect.left).toBeCloseTo(triggerRect.left, 2);
        expect(settledTriggerRect.top).toBeCloseTo(triggerRect.top, 2);
        expect(settledTriggerRect.width).toBeCloseTo(triggerRect.width, 2);
        expect(settledMenuRect.left).toBeCloseTo(menuRect.left, 2);
        expect(settledMenuRect.top).toBeCloseTo(menuRect.top, 2);
    });

    it('preserves the native contextmenu event', async () => {
        renderEditor();

        await getEditor();

        const block = await poll(() => document.querySelector<HTMLElement>('[data-id="sd-1"]'), 'stage direction block');
        const event = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
        });

        block.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(false);
    });
});
