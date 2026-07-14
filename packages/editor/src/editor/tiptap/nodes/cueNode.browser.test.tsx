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
        const input = pill.querySelector('[data-cue-title-input="start"]');

        expect(input).toBeInstanceOf(HTMLSpanElement);
        expect(input?.textContent).toBe('Night');
    });

    it('keeps the number with the first word while later title words wrap', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'První super song');

        const pill = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-pill="start"]'),
            'cue pill',
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
            () => fixture.querySelector<HTMLElement>('[data-cue-number]'),
            'cue number',
        );
        const title = await poll(
            () => fixture.querySelector<HTMLElement>('[data-cue-title-input="start"]'),
            'cue title',
        );

        const titleNode = title.firstChild;

        if (!(titleNode instanceof Text)) {
            throw new Error('Cue title text node not found');
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

    const activatePill = async () => {
        const input = await poll(
            () => document.querySelector('[data-cue-title-input="start"]'),
            'title input',
        );

        await page.elementLocator(input).click();
    };

    it('shows the menu without cue type controls', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');
        expect(document.querySelector('[data-cue-menu="start"]')).toBeNull();

        await activatePill();

        const menu = await poll(
            () => document.querySelector('[data-cue-menu="start"]'),
            'pill menu',
        );

        expect(menu.querySelector('[aria-label^="Switch cue to"]')).toBeNull();
        expect(cueStartAttrs(editor)?.mode).toBe('open');
    });

    it('opens the cue manager with the cue selected', async () => {
        const onOpenCueManager = vi.fn();

        renderEditor(createDocument(), {onOpenCueManager});

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        await activatePill();
        await poll(() => document.querySelector('[data-cue-menu="start"]'), 'pill menu');
        await clickMenuButton('Manage cue');

        expect(onOpenCueManager).toHaveBeenCalledWith(cueStartAttrs(editor)?.cueId);
    });

    it('navigates from the cue start to its end and back', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        editor.commands.insertCueOut('sd-2');

        const outPill = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-pill="out"]'),
            'cue out pill',
        );
        const startPill = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-pill="start"]'),
            'cue start pill',
        );
        const scrollToEnd = vi.fn();
        const scrollToStart = vi.fn();

        outPill.scrollIntoView = scrollToEnd;
        startPill.scrollIntoView = scrollToStart;

        await activatePill();
        await poll(() => document.querySelector('[data-cue-menu="start"]'), 'start pill menu');
        await clickMenuButton('Go to cue end');

        expect(scrollToEnd).toHaveBeenCalledWith({
            block: 'center',
            inline: 'nearest',
        });

        const outLabel = outPill.querySelector<HTMLElement>('[role="button"]');

        if (!outLabel) {
            throw new Error('Cue out label not found');
        }

        await page.elementLocator(outLabel).click();
        await poll(() => document.querySelector('[data-cue-menu="out"]'), 'out pill menu');
        await clickMenuButton('Go to cue start');

        expect(scrollToStart).toHaveBeenCalledWith({
            block: 'center',
            inline: 'nearest',
        });
    });

    it('activates the pill when clicking anywhere on the tag, not just the input', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        const number = await poll(
            () => document.querySelector('[data-cue-number]'),
            'cue number',
        );

        await page.elementLocator(number).click();

        await poll(() => document.querySelector('[data-cue-menu="start"]'), 'pill menu');
        expect(document.activeElement).toBe(document.querySelector('[data-cue-title-input="start"]'));
    });

    it('activates the enclosing block when the cue tag is focused', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-2', 'Night');

        const input = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-title-input="start"]'),
            'cue title input',
        );

        await page.elementLocator(input).click();

        /*
         * Focus is on the cue input (editor is blurred), yet the block overlay
         * should anchor to sd-2 — the block that owns the focused cue tag.
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

    it('edits the cue title inline in the pill', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', '');

        const pill = await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');
        const input = await poll(
            () => pill.querySelector('[data-cue-title-input="start"]'),
            'title input',
        );

        /*
         * An empty cue collapses to just its number at rest, so the edit target is
         * the tag (number); clicking it focuses and expands the input.
         */
        const number = await poll(() => pill.querySelector('[data-cue-number]'), 'cue number');

        await page.elementLocator(number).click();
        await userEvent.type(page.elementLocator(input), 'Renamed');

        expect(cueStartAttrs(editor)?.title).toBe('Renamed');
    });

    it('boxes the cue with an outline and no horizontal padding or border (export width parity)', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        const numberEl = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-number]'),
            'cue number',
        );
        const tagBody = numberEl.parentElement as HTMLElement;
        const cs = getComputedStyle(tagBody);

        /*
         * The box is drawn with outline (zero layout) instead of border + padding,
         * so the cue occupies exactly the export's character cells.
         */
        expect(cs.paddingLeft).toBe('0px');
        expect(cs.paddingRight).toBe('0px');
        expect(cs.borderLeftWidth).toBe('0px');
        expect(cs.borderRightWidth).toBe('0px');
        expect(cs.outlineStyle).toBe('solid');
    });

    it('collapses a title-less cue to just its number at rest', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', '');

        const input = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-title-input="start"]'),
            'title input',
        );

        /*
         * Empty + inactive has no placeholder, so the cue is just its number,
         * matching the export string `" number "`.
         */
        expect(input.textContent).toBe('');
        expect(input.hasAttribute('data-placeholder')).toBe(false);
    });

    it('keeps an empty confirmed cue title editable without deleting the cue', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        const input = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-title-input="start"]'),
            'title input',
        );

        await page.elementLocator(input).click();

        const selection = window.getSelection();
        const range = document.createRange();

        range.selectNodeContents(input);
        selection?.removeAllRanges();
        selection?.addRange(range);
        await userEvent.keyboard('{Backspace}');

        expect(cueStartAttrs(editor)?.title).toBe('');
        expect(document.querySelector('[data-cue-pill="start"]')).toBeTruthy();
    });

    it('deletes a cue from the menu', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');

        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        await activatePill();
        await poll(() => document.querySelector('[data-cue-menu="start"]'), 'pill menu');
        await clickMenuButton('Remove cue');
        await poll(() => document.querySelector('[data-cue-pill="start"]') ? null : true, 'pill removed');

        expect(document.querySelector('[data-cue-pill="start"]')).toBeNull();
    });

    it('deletes the paired cue-out when deleting an open cue from the menu', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        editor.commands.insertCueOut('sd-2');

        await poll(() => document.querySelector('[data-id="sd-2"] [data-cue-pill="out"]'), 'cue out pill');
        await activatePill();
        await poll(() => document.querySelector('[data-cue-menu="start"]'), 'pill menu');
        await clickMenuButton('Remove cue');
        await poll(() => document.querySelector('[data-cue-pill="start"]') ? null : true, 'pill removed');

        expect(document.querySelector('[data-cue-pill="start"]')).toBeNull();
        expect(document.querySelector('[data-id="sd-2"] [data-cue-pill="out"]')).toBeNull();
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

    const cueOwnerBlockId = (editor: Editor): string | undefined => {
        const content = editor.getJSON().content as ScriptNode[] | undefined;

        return content?.find(node => node.content?.some(child => child.type === 'cueStart'))?.attrs?.id as
            | string
            | undefined;
    };

    it('keeps a cue in its block when splitting an otherwise-empty block with Enter', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        // Caret before the cue (block has no text besides the cue).
        editor.commands.focus('start');
        // Empty block → Enter opens the next-block chooser; a second Enter confirms.
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard('{Enter}');

        const content = editor.getJSON().content as ScriptNode[] | undefined;

        expect(content?.length).toBe(2);
        expect(cueOwnerBlockId(editor)).toBe('sd-1');
    });

    it('keeps a cue in its block when splitting at the end of block text with Enter', async () => {
        renderEditor(createDocumentWithText());

        const editor = await getEditor();

        editor.commands.insertCueStart('sd-1', 'Night');
        await poll(() => document.querySelector('[data-cue-pill="start"]'), 'cue start pill');

        // Caret at the end of the text but before the trailing cue atom.
        const block = editor.state.doc.firstChild;
        const textEnd = 1 + (block?.content.firstChild?.nodeSize ?? 0);

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, textEnd)));
        await userEvent.keyboard('{Enter}');

        const content = editor.getJSON().content as ScriptNode[] | undefined;

        expect(content?.length).toBe(2);
        expect(cueOwnerBlockId(editor)).toBe('sd-1');
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
