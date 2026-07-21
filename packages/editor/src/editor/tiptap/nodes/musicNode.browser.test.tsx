import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
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

import {useEditorInstance} from '../../context';
import type {EditorLifecycleCallbacks} from '../../contracts';
import ScriptEditor from '../../Editor';

type MusicTestWindow = Window & {__musicTestEditor?: Editor | null};

const createStageDirection = (id: string, content: ScriptNode[] = []): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content,
});
const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as MusicTestWindow).__musicTestEditor = editor;

        return () => {
            delete (window as MusicTestWindow).__musicTestEditor;
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

const renderEditor = (
    initialValue: ScriptDocument = createDocument(),
    callbacks?: EditorLifecycleCallbacks,
) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{initialValue}}
            layout={{autoFocus: true}}
            callbacks={callbacks}
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

const getEditor = () => poll(() => (window as MusicTestWindow).__musicTestEditor ?? null, 'editor instance');

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('music pill node views', () => {
    it('renders a music start pill with its title', async () => {
        renderEditor();

        const editor = await getEditor();

        expect(editor.commands.insertMusicStart('sd-1', 'Night')).toBe(true);

        const pill = await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');
        const input = pill.querySelector('[data-music-title-input="start"]');

        expect(input).toBeInstanceOf(HTMLSpanElement);
        expect(input?.textContent).toBe('Night');
    });

    it('updates music title and kind by id', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night', 'open', {
            musicId: 'music-1',
            kind: 'song',
        });

        expect(editor.commands.updateMusicMetadata('music-1', 'Overture', 'instrumental')).toBe(true);

        const titleInput = await poll(
            () => document.querySelector('[data-music-title-input="start"]'),
            'updated music title',
        );

        expect(titleInput.textContent).toBe('Overture');
        expect(musicStartAttrs(editor)).toMatchObject({
            title: 'Overture',
            kind: 'instrumental',
        });
    });

    it('keeps the number with the first word while later title words wrap', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'První super song');

        const pill = await poll(
            () => document.querySelector<HTMLElement>('[data-music-pill="start"]'),
            'music pill',
        );
        const fixture = document.createElement('div');

        fixture.style.position = 'fixed';
        fixture.style.inset = '0 auto auto 0';
        fixture.style.width = '12ch';
        fixture.style.font = getComputedStyle(pill).font;
        fixture.style.whiteSpace = 'pre-wrap';
        fixture.appendChild(pill.cloneNode(true));
        document.body.appendChild(fixture);

        const number = await poll(
            () => fixture.querySelector<HTMLElement>('[data-music-number]'),
            'music number',
        );
        const title = await poll(
            () => fixture.querySelector<HTMLElement>('[data-music-title-input="start"]'),
            'music title',
        );

        const titleNode = title.firstChild;

        if (!(titleNode instanceof Text)) {
            throw new Error('Music title text node not found');
        }

        const firstWordRange = document.createRange();
        const lastWordRange = document.createRange();

        firstWordRange.setStart(titleNode, 0);
        firstWordRange.setEnd(titleNode, 5);
        lastWordRange.setStart(titleNode, 12);
        lastWordRange.setEnd(titleNode, 16);

        const numberTop = number.getBoundingClientRect().top;
        const firstWordTop = firstWordRange.getBoundingClientRect().top;
        const lastWordTop = lastWordRange.getBoundingClientRect().top;

        expect(firstWordTop).toBeCloseTo(numberTop, 1);
        expect(lastWordTop).toBeGreaterThan(firstWordTop);
    });

    it('allows at most one music atom per stage direction block', async () => {
        renderEditor();

        const editor = await getEditor();

        expect(editor.commands.insertMusicStart('sd-1', 'Night')).toBe(true);
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        expect(editor.commands.insertMusicStart('sd-1', 'Second')).toBe(false);
        expect(editor.commands.insertMusicOut('sd-1')).toBe(false);

        const block = document.querySelector('[data-id="sd-1"]');

        expect(block?.querySelectorAll('[data-music-pill]').length).toBe(1);
    });

    it('inserts an out into its own empty block', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        expect(editor.commands.insertMusicOut('sd-2')).toBe(true);

        const out = await poll(
            () => document.querySelector('[data-id="sd-2"] [data-music-pill="out"]'),
            'music out pill',
        );

        expect(out.getAttribute('data-music-pill')).toBe('out');
    });

    it('does not grow the stage-direction line height when a music is inserted', async () => {
        renderEditor(createDocumentWithText());

        const editor = await getEditor();
        const block = await poll(() => document.querySelector('[data-id="sd-1"]'), 'stage direction block');
        const before = (block as HTMLElement).getBoundingClientRect().height;

        expect(editor.commands.insertMusicStart('sd-1', 'Night')).toBe(true);
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        const after = (block as HTMLElement).getBoundingClientRect().height;

        expect(after).toBeCloseTo(before, 0);
    });

    const musicStartAttrs = (editor: Editor): Record<string, unknown> | undefined => {
        const content = editor.getJSON().content as ScriptNode[] | undefined;
        const stageDirection = content?.find(node => node.attrs?.id === 'sd-1');

        return stageDirection?.content?.find(node => node.type === 'musicStart')?.attrs;
    };

    const clickMenuButton = async (label: string) => {
        const button = Array.from(document.querySelectorAll('[data-music-menu] button'))
            .find(candidate => candidate.getAttribute('aria-label') === label);

        if (!button) {
            throw new Error(`Menu button "${label}" not found`);
        }

        await page.elementLocator(button).click();
    };

    const activatePill = async () => {
        const input = await poll(
            () => document.querySelector('[data-music-title-input="start"]'),
            'title input',
        );

        await page.elementLocator(input).click();
    };

    it('shows the menu without music type controls', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');
        expect(document.querySelector('[data-music-menu="start"]')).toBeNull();

        await activatePill();

        const menu = await poll(
            () => document.querySelector('[data-music-menu="start"]'),
            'pill menu',
        );

        expect(menu.querySelector('[aria-label^="Switch music to"]')).toBeNull();
        expect(musicStartAttrs(editor)?.mode).toBe('open');
    });

    it('opens the music manager with the music selected', async () => {
        const onOpenMusicManager = vi.fn();

        renderEditor(createDocument(), {onOpenMusicManager});

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        await activatePill();
        await poll(() => document.querySelector('[data-music-menu="start"]'), 'pill menu');
        await clickMenuButton('Manage music');

        expect(onOpenMusicManager).toHaveBeenCalledWith(musicStartAttrs(editor)?.musicId);
    });

    it('navigates from the music start to its end and back', async () => {
        renderEditor(createTwoBlockDocument(), {onOpenMusicManager: vi.fn()});

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        editor.commands.insertMusicOut('sd-2');

        const outPill = await poll(
            () => document.querySelector<HTMLElement>('[data-music-pill="out"]'),
            'music out pill',
        );
        const startPill = await poll(
            () => document.querySelector<HTMLElement>('[data-music-pill="start"]'),
            'music start pill',
        );
        const scrollToEnd = vi.fn();
        const scrollToStart = vi.fn();

        outPill.scrollIntoView = scrollToEnd;
        startPill.scrollIntoView = scrollToStart;

        await activatePill();

        const startMenu = await poll(
            () => document.querySelector('[data-music-menu="start"]'),
            'start pill menu',
        );

        expect([...startMenu.querySelectorAll('button')].map(button => button.ariaLabel)).toEqual([
            'Go to music end',
            'Manage music',
            'Remove music',
        ]);

        await clickMenuButton('Go to music end');

        expect(scrollToEnd).toHaveBeenCalledWith({
            block: 'center',
            inline: 'nearest',
        });

        const outLabel = outPill.querySelector<HTMLElement>('[role="button"]');

        if (!outLabel) {
            throw new Error('Music out label not found');
        }

        await page.elementLocator(outLabel).click();

        const outMenu = await poll(
            () => document.querySelector('[data-music-menu="out"]'),
            'out pill menu',
        );

        expect([...outMenu.querySelectorAll('button')].map(button => button.ariaLabel)).toEqual([
            'Go to music start',
            'Manage music',
            'Delete end',
        ]);

        await clickMenuButton('Go to music start');

        expect(scrollToStart).toHaveBeenCalledWith({
            block: 'center',
            inline: 'nearest',
        });
    });

    it('activates the pill when clicking anywhere on the tag, not just the input', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const number = await poll(
            () => document.querySelector('[data-music-number]'),
            'music number',
        );

        await page.elementLocator(number).click();

        await poll(() => document.querySelector('[data-music-menu="start"]'), 'pill menu');
        expect(document.activeElement).toBe(document.querySelector('[data-music-title-input="start"]'));
    });

    it('activates the enclosing block when the music tag is focused', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-2', 'Night');

        const input = await poll(
            () => document.querySelector<HTMLElement>('[data-music-title-input="start"]'),
            'music title input',
        );

        await page.elementLocator(input).click();

        /*
         * Focus is on the music input (editor is blurred), yet the block overlay
         * should anchor to sd-2 — the block that owns the focused music tag.
         */
        expect(document.activeElement).toBe(input);

        const trigger = await poll(
            () => document.querySelector(
                '[data-block-actions-overlay="true"] [data-block-id="sd-2"]',
            ),
            'block actions overlay for sd-2',
        );

        expect(trigger).toBeTruthy();
    });

    it('edits the music title inline in the pill', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', '');

        const pill = await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');
        const input = await poll(
            () => pill.querySelector('[data-music-title-input="start"]'),
            'title input',
        );

        /*
         * An empty music collapses to just its number at rest, so the edit target is
         * the tag (number); clicking it focuses and expands the input.
         */
        const number = await poll(() => pill.querySelector('[data-music-number]'), 'music number');

        await page.elementLocator(number).click();
        await userEvent.type(page.elementLocator(input), 'Renamed');

        expect(musicStartAttrs(editor)?.title).toBe('Renamed');
    });

    it('boxes the music with an outline and no horizontal padding or border (export width parity)', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const numberEl = await poll(
            () => document.querySelector<HTMLElement>('[data-music-number]'),
            'music number',
        );
        const tagBody = numberEl.parentElement as HTMLElement;
        const cs = getComputedStyle(tagBody);

        /*
         * The box is drawn with outline (zero layout) instead of border + padding,
         * so the music occupies exactly the export's character cells.
         */
        expect(cs.paddingLeft).toBe('0px');
        expect(cs.paddingRight).toBe('0px');
        expect(cs.borderLeftWidth).toBe('0px');
        expect(cs.borderRightWidth).toBe('0px');
        expect(cs.outlineStyle).toBe('solid');
    });

    it('collapses a title-less music to just its number at rest', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', '');

        const input = await poll(
            () => document.querySelector<HTMLElement>('[data-music-title-input="start"]'),
            'title input',
        );

        /*
         * Empty + inactive has no placeholder, so the music is just its number,
         * matching the export string `" number "`.
         */
        expect(input.textContent).toBe('');
        expect(input.hasAttribute('data-placeholder')).toBe(false);
    });

    it('keeps an empty confirmed music title editable without deleting the music', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        const input = await poll(
            () => document.querySelector<HTMLElement>('[data-music-title-input="start"]'),
            'title input',
        );

        await page.elementLocator(input).click();

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(input);
        selection?.removeAllRanges();
        selection?.addRange(range);
        await userEvent.keyboard('{Backspace}');

        expect(musicStartAttrs(editor)?.title).toBe('');
        expect(document.querySelector('[data-music-pill="start"]')).toBeTruthy();
    });

    it('deletes a music from the menu', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');

        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        await activatePill();
        await poll(() => document.querySelector('[data-music-menu="start"]'), 'pill menu');
        await clickMenuButton('Remove music');
        await poll(() => document.querySelector('[data-music-pill="start"]') ? null : true, 'pill removed');

        expect(document.querySelector('[data-music-pill="start"]')).toBeNull();
    });

    it('deletes the paired music-out when deleting an open music from the menu', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        editor.commands.insertMusicOut('sd-2');

        await poll(() => document.querySelector('[data-id="sd-2"] [data-music-pill="out"]'), 'music out pill');
        await activatePill();
        await poll(() => document.querySelector('[data-music-menu="start"]'), 'pill menu');
        await clickMenuButton('Remove music');
        await poll(() => document.querySelector('[data-music-pill="start"]') ? null : true, 'pill removed');

        expect(document.querySelector('[data-music-pill="start"]')).toBeNull();
        expect(document.querySelector('[data-id="sd-2"] [data-music-pill="out"]')).toBeNull();
    });

    it('does not delete a music via Backspace', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        editor.commands.focus('end');
        await userEvent.keyboard('{Backspace}');

        expect(document.querySelector('[data-music-pill="start"]')).toBeTruthy();
    });

    const musicOwnerBlockId = (editor: Editor): string | undefined => {
        const content = editor.getJSON().content as ScriptNode[] | undefined;

        return content?.find(node => node.content?.some(child => child.type === 'musicStart'))?.attrs?.id as
            | string
            | undefined;
    };

    it('keeps a music in its block when splitting an otherwise-empty block with Enter', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        // Caret before the music (block has no text besides the music).
        editor.commands.focus('start');
        // Empty block → Enter opens the next-block chooser; a second Enter confirms.
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard('{Enter}');

        const content = editor.getJSON().content as ScriptNode[] | undefined;

        expect(content?.length).toBe(2);
        expect(musicOwnerBlockId(editor)).toBe('sd-1');
    });

    it('keeps a music in its block when splitting at the end of block text with Enter', async () => {
        renderEditor(createDocumentWithText());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        // Caret at the end of the text but before the trailing music atom.
        const block = editor.state.doc.firstChild;
        const textEnd = 1 + (block?.content.firstChild?.nodeSize ?? 0);

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, textEnd)));
        await userEvent.keyboard('{Enter}');

        const content = editor.getJSON().content as ScriptNode[] | undefined;

        expect(content?.length).toBe(2);
        expect(musicOwnerBlockId(editor)).toBe('sd-1');
    });

    it('keeps a music when deleting selected stage-direction content around it', async () => {
        renderEditor(createDocumentWithText());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-music-pill="start"]'), 'music start pill');

        const block = editor.state.doc.firstChild;
        const contentEnd = 1 + (block?.content.size ?? 0);

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1, contentEnd)));
        await userEvent.keyboard('{Backspace}');

        const content = editor.getJSON().content as ScriptNode[] | undefined;
        const stageDirection = content?.find(node => node.attrs?.id === 'sd-1');

        expect(stageDirection?.content?.map(node => node.type)).toEqual(['musicStart']);
        expect(stageDirection?.content?.[0]?.attrs).toEqual(musicStartAttrs(editor));
        expect(document.querySelector('[data-music-pill="start"]')).toBeTruthy();
    });
});
