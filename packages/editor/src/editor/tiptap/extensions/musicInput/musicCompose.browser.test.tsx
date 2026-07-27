import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {
    createRoot, type Root,
} from 'react-dom/client';
import {
    afterEach, describe, expect, it, vi,
} from 'vite-plus/test';
import {
    page, userEvent,
} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../../context';
import type {
    EditorMusicRemoveRequest,
    EditorProps,
} from '../../../contracts';
import ScriptEditor from '../../../Editor';
import {getCharacterTagComposeFromState} from '../CharacterTagInputExtension';

type MusicTestWindow = Window & {__musicComposeEditor?: Editor | null};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as MusicTestWindow).__musicComposeEditor = editor;

        return () => {
            delete (window as MusicTestWindow).__musicComposeEditor;
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

const createNumberedMusicDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'sd-1'},
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'music-1', mode: 'open', title: 'Night', kind: null,
                    },
                },
            ],
        }, {
            type: 'stageDirection',
            attrs: {id: 'sd-2'},
            content: [{type: 'musicOut'}],
        },
    ],
});

const mountedRoots: Root[] = [];

type RenderEditorOptions = {
    document?: Partial<Omit<EditorProps['document'], 'initialValue'>>,
    callbacks?: EditorProps['callbacks'],
};

const renderEditor = (
    initialValue: ScriptDocument = createDocument(),
    options: RenderEditorOptions = {},
) => {
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
            layout={{autoFocus: true}}
            callbacks={options.callbacks}
        >
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

const getEditor = () => poll(() => (window as MusicTestWindow).__musicComposeEditor ?? null, 'editor instance');

const getStageDirection = (editor: Editor): ScriptNode | undefined => {
    const content = editor.getJSON().content as ScriptNode[] | undefined;

    return content?.find(node => node.attrs?.id === 'sd-1');
};

const findMusicStartPosition = (editor: Editor): number | null => {
    let position: number | null = null;

    editor.state.doc.descendants((node, pos) => {
        if (position !== null) {
            return false;
        }

        if (node.type.name === 'musicStart') {
            position = pos;

            return false;
        }

        return true;
    });

    return position;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('music # compose', () => {
    it('turns # + title + Enter into a titled music at the block end', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#Night');
        await userEvent.keyboard('{Enter}');

        const pill = await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');
        const input = pill.querySelector<HTMLElement>('[data-music-title-input="start"]');

        expect(input?.textContent).toBe('Night');

        const number = pill.querySelector<HTMLElement>('[data-music-number]');

        expect(number?.textContent).toBe('0)');
        expect(number?.nextSibling?.textContent).toBe('\u00A0');
        expect(getComputedStyle(input as HTMLElement).maxWidth).toBe('none');
        expect(getComputedStyle(input as HTMLElement).whiteSpace).not.toBe('nowrap');

        const tagBody = number?.parentElement;
        const pillStyle = getComputedStyle(pill);

        expect(getComputedStyle(tagBody as HTMLElement).display).toBe('inline');
        expect(pillStyle.marginInlineStart).toBe('0px');
        expect(pill.firstChild?.textContent).toBe(' ');
        expect(pill.lastChild?.textContent).toBe(' ');
        expect(getComputedStyle(number as HTMLElement).fontWeight).toBe('700');
        expect(getComputedStyle(number as HTMLElement).color).toBe(getComputedStyle(input as HTMLElement).color);

        const stageDirection = getStageDirection(editor);
        const musicStart = stageDirection?.content?.find(node => node.type === 'musicStart');

        expect(musicStart?.attrs?.title).toBe('Night');
        expect((stageDirection?.content ?? []).some(node => node.type === 'text' && (node.text ?? '').includes('Night'))).toBe(false);
    });

    it('suggests unassigned persistent music after # and inserts the selected music id', async () => {
        const onMusicAssigned = vi.fn();

        renderEditor(createDocument(), {
            document: {
                persistentMusic: [
                    {
                        id: 'music-existing',
                        title: 'Overture',
                        kind: 'instrumental',
                        assignmentLabel: null,
                    },
                ],
            },
            callbacks: {
                onMusicAssigned,
            },
        });

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#');

        const listbox = await poll(() => document.querySelector('[role="listbox"][aria-label="Music suggestions"]'), 'music suggestions');

        expect(listbox.textContent).toContain('Overture');

        await userEvent.keyboard('{ArrowDown}');
        await new Promise(resolve => window.requestAnimationFrame(resolve));
        await userEvent.keyboard('{Enter}');

        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        const stageDirection = getStageDirection(editor);
        const musicStart = stageDirection?.content?.find(node => node.type === 'musicStart');

        expect(musicStart?.attrs).toMatchObject({
            musicId: 'music-existing',
            title: 'Overture',
            kind: 'instrumental',
        });
        expect(onMusicAssigned).toHaveBeenCalledWith('music-existing');
    });

    it('notifies the app when an editor music start is removed', async () => {
        const onMusicUnassigned = vi.fn();

        renderEditor(createDocument(), {
            document: {
                persistentMusic: [
                    {
                        id: 'music-existing',
                        title: 'Overture',
                        kind: 'instrumental',
                        assignmentLabel: null,
                    },
                ],
            },
            callbacks: {
                onMusicUnassigned,
            },
        });

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#Overture');
        await userEvent.keyboard('{Enter}');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        const musicPosition = findMusicStartPosition(editor);

        expect(musicPosition).not.toBeNull();
        expect(editor.commands.deleteMusicStart(musicPosition as number)).toBe(true);
        expect(onMusicUnassigned).toHaveBeenCalledWith('music-existing');
    });

    it('requests confirmation before unassigning music from the editor pill menu', async () => {
        const removeRequestRef: {current: EditorMusicRemoveRequest | null} = {current: null};
        const onMusicUnassigned = vi.fn();

        renderEditor(createDocument(), {
            document: {
                persistentMusic: [
                    {
                        id: 'music-existing',
                        title: 'Overture',
                        kind: 'instrumental',
                        assignmentLabel: null,
                    },
                ],
            },
            callbacks: {
                onRequestRemoveMusic: request => {
                    removeRequestRef.current = request;
                },
                onMusicUnassigned,
            },
        });

        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#Overture');
        await userEvent.keyboard('{Enter}');

        const pill = await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        await page.elementLocator(pill).click();

        const unassignButton = await poll(
            () => document.querySelector('button[aria-label="Unassign music"]'),
            'unassign music button',
        );

        await page.elementLocator(unassignButton).click();

        const removeRequest = removeRequestRef.current;

        if (!removeRequest) {
            throw new Error('Expected remove music request');
        }

        expect(removeRequest.musicId).toBe('music-existing');
        expect(removeRequest.title).toBe('Overture');
        expect(document.querySelector('[data-music-pill="start"]')).toBeTruthy();
        expect(removeRequest.complete()).toBe(true);
        expect(onMusicUnassigned).toHaveBeenCalledWith('music-existing');
        await poll(() => document.querySelector('[data-music-pill="start"]') ? null : true, 'music unassigned');
    });

    it('cancels on Escape, leaving no music and no stray title text', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#Song');
        await userEvent.keyboard('{Escape}');

        await poll(() => document.querySelector('[data-music-pill]') ? null : true, 'no music pill');

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

        await poll(() => document.querySelector('[data-music-pill]') ? null : true, 'no music pill');

        const stageDirection = getStageDirection(editor);

        expect((stageDirection?.content ?? []).some(node => node.type === 'text' && (node.text ?? '').includes('Half'))).toBe(false);
    });

    it('shows an initially empty draft pill right after #', async () => {
        renderEditor();

        await getEditor();

        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#');

        const composePill = await poll(() => document.querySelector('[data-music-title-input="start"]'), 'draft pill');

        expect(composePill).toBeTruthy();
        expect(composePill?.getAttribute('data-music-draft')).toBe('true');
    });

    it('Backspace on an empty title cancels the draft and # re-triggers', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#');
        await poll(() => document.querySelector('[data-music-title-input="start"]'), 'draft pill');

        await userEvent.keyboard('{Backspace}');
        await poll(() => document.querySelector('[data-music-title-input="start"]') ? null : true, 'draft cleared');

        await userEvent.type(el, '#');
        await poll(() => document.querySelector('[data-music-title-input="start"]'), 'draft pill again');

        const stageDirection = getStageDirection(editor);

        expect((stageDirection?.content ?? []).some(node => node.type === 'text' && (node.text ?? '').includes('#'))).toBe(false);
    });

    it('# + "out" + Enter commits a titled music; out has its own command', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#out');
        await userEvent.keyboard('{Enter}');

        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        const stageDirection = getStageDirection(editor);

        expect((stageDirection?.content ?? []).some(node => node.type === 'musicOut')).toBe(false);
        expect((stageDirection?.content ?? []).some(node => node.type === 'musicStart')).toBe(true);
    });

    it('@ still opens the character-tag compose in a stage direction that has a music', async () => {
        renderEditor();

        const editor = await getEditor();
        const el = page.elementLocator(await poll(() => document.querySelector('[contenteditable="true"]'), 'editor'));

        await el.click();
        await userEvent.type(el, '#Night');
        await userEvent.keyboard('{Enter}');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        await userEvent.type(el, '@');

        expect(getCharacterTagComposeFromState(editor.state)).not.toBeNull();
    });

    it('keeps the closed music out pill structural', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        editor.commands.insertMusicOut('sd-2');

        const outPill = await poll(() => document.querySelector('[data-music-pill="out"]'), 'music out pill');

        expect(outPill.textContent).toBe('');
        expect(outPill.getAttribute('aria-hidden')).toBe('true');
    });

    it('keeps music labels after the document is loaded again', async () => {
        renderEditor(createNumberedMusicDocument());

        const editor = await getEditor();

        editor.commands.setContent(editor.getJSON(), {emitUpdate: false});

        await new Promise(resolve => window.requestAnimationFrame(resolve));

        const number = document.querySelector<HTMLElement>('[data-music-number]');

        expect(number?.textContent).toBe('0)');
    });
});
