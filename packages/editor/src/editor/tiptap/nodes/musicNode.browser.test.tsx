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
import {getEmptyEnterChooserFromState} from '../extensions/EmptyEnterChooserExtension';
import {musicRailPluginKey} from '../extensions/musicRail/MusicRailExtension';

type MusicTestWindow = Window & {__musicTestEditor?: Editor | null};

const createStageDirection = (id: string, content: ScriptNode[] = []): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content,
});
const createAside = (id: string, content: ScriptNode[] = []): ScriptNode => ({
    type: 'aside', attrs: {id}, content,
});
const createNote = (id: string, content: ScriptNode[] = []): ScriptNode => ({
    type: 'note', attrs: {id}, content,
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

const createThreeBlockDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        createStageDirection('sd-1'),
        createStageDirection('sd-2'),
        createStageDirection('sd-3'),
    ],
});

const createFourBlockDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        createStageDirection('sd-1'),
        createStageDirection('sd-2'),
        createStageDirection('sd-3'),
        createStageDirection('sd-4'),
    ],
});

const createOrphanDragDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [
        createStageDirection('sd-1', [{type: 'musicOut'}]),
        createStageDirection('sd-2', [
            {
                type: 'musicStart',
                attrs: {
                    musicId: 'music-1',
                    mode: 'open',
                    title: 'Night',
                    kind: null,
                    isDraft: false,
                },
            },
        ]),
        createStageDirection('sd-3'),
    ],
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
    it('does not rebuild the music rail model for prose typing', async () => {
        renderEditor(createDocumentWithText());

        const editor = await getEditor();
        const boundary = await poll(
            () => document.querySelector('[data-music-rail-boundary="true"]'),
            'music rail boundary',
        );
        const before = musicRailPluginKey.getState(editor.state)?.rebuildCount;

        editor.commands.insertContent('!');

        expect(boundary.isConnected).toBe(true);
        expect(musicRailPluginKey.getState(editor.state)?.rebuildCount).toBe(before);
    });

    it('adds and focuses an empty music draft from the active block rail trigger', async () => {
        renderEditor();

        await getEditor();

        const boundary = await poll(
            () => document.querySelector('[data-music-rail-active-trigger="true"][data-block-id="sd-1"]'),
            'active block music trigger',
        );

        await page.elementLocator(boundary).click();

        const menu = await poll(
            () => document.querySelector('[data-music-rail-menu="true"]'),
            'music boundary menu',
        );
        const addMusic = [...menu.querySelectorAll('button')]
            .find(button => button.textContent?.includes('Add music'));

        if (!addMusic) {
            throw new Error('Add music rail action not found');
        }

        await page.elementLocator(addMusic).click();

        const title = await poll(
            () => document.querySelector('[data-music-title-input="start"]'),
            'rail music title',
        );

        expect(document.activeElement).toBe(title);
    });

    it('finishes a titled music draft when its title loses focus', async () => {
        const onRequestCreateMusic = vi.fn((request: Parameters<NonNullable<EditorLifecycleCallbacks['onRequestCreateMusic']>>[0]) => {
            request.complete({
                id: 'music-created',
                title: request.title,
                kind: 'song',
                assignmentLabel: null,
            });
        });

        renderEditor(createDocument(), {onRequestCreateMusic});

        await getEditor();

        const boundary = await poll(
            () => document.querySelector('[data-music-rail-active-trigger="true"][data-block-id="sd-1"]'),
            'active block music trigger',
        );

        await page.elementLocator(boundary).click();

        const menu = await poll(
            () => document.querySelector('[data-music-rail-menu="true"]'),
            'music boundary menu',
        );
        const addMusic = [...menu.querySelectorAll('button')]
            .find(button => button.textContent?.includes('Add music'));

        if (!addMusic) {
            throw new Error('Add music rail action not found');
        }

        await page.elementLocator(addMusic).click();

        const title = await poll(
            () => document.querySelector<HTMLElement>('[data-music-draft="true"]'),
            'draft music title',
        );

        title.focus();
        title.textContent = 'Night';
        title.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            data: 'Night',
            inputType: 'insertText',
        }));
        title.blur();

        await poll(
            () => document.querySelector('[data-start-music-id="music-created"]'),
            'created music rail marker',
        );

        expect(onRequestCreateMusic).toHaveBeenCalledOnce();
        expect(onRequestCreateMusic.mock.calls[0]?.[0].title).toBe('Night');
        expect(document.querySelector('[data-music-draft="true"]')).toBeNull();
    });

    it('removes a pending music draft when its creation request is cancelled', async () => {
        type CancellableMusicRequest = Parameters<NonNullable<EditorLifecycleCallbacks['onRequestCreateMusic']>>[0] & {
            cancel?: () => boolean,
        };

        let request: CancellableMusicRequest | null = null;

        renderEditor(createDocument(), {
            onRequestCreateMusic: nextRequest => {
                request = nextRequest;
            },
        });

        const editor = await getEditor();

        expect(editor.commands.insertMusicDraft('sd-1')).toBe(true);

        const title = await poll(
            () => document.querySelector<HTMLElement>('[data-music-draft="true"]'),
            'draft music title',
        );

        title.focus();
        title.textContent = 'Night';
        title.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            data: 'Night',
            inputType: 'insertText',
        }));
        title.blur();

        const pendingRequest = await poll<CancellableMusicRequest>(
            () => request,
            'music creation request',
        );

        expect(pendingRequest.cancel).toBeTypeOf('function');
        expect(pendingRequest.cancel?.()).toBe(true);

        await poll(
            () => document.querySelector('[data-music-pill="start"]') ? null : true,
            'cancelled music draft removal',
        );
    });

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

    it('does not insert an out when there is no preceding durational music', async () => {
        renderEditor(createTwoBlockDocument());

        const editor = await getEditor();

        expect(editor.commands.insertMusicOut('sd-2')).toBe(false);
        expect(document.querySelector('[data-id="sd-2"] [data-music-pill="out"]')).toBeNull();
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

    it('keeps an aside closing parenthesis on its text line when the music ends there', async () => {
        renderEditor({
            type: 'doc',
            content: [
                createStageDirection('sd-1', [
                    {
                        type: 'musicStart',
                        attrs: {
                            musicId: 'music-1',
                            mode: 'open',
                            title: 'Night',
                            kind: null,
                            isDraft: false,
                        },
                    },
                ]),
                createAside('aside-1', [{type: 'text', text: 'quietly'}, {type: 'musicOut'}]),
                createAside('aside-2', [{type: 'text', text: 'quietly'}]),
            ],
        });

        const asideWithMusicOut = await poll(
            () => document.querySelector<HTMLElement>('[data-id="aside-1"]'),
            'aside with music end',
        );
        const plainAside = await poll(
            () => document.querySelector<HTMLElement>('[data-id="aside-2"]'),
            'plain aside',
        );
        const musicOutWrapper = asideWithMusicOut.querySelector<HTMLElement>('.node-musicOut');

        expect(asideWithMusicOut.getBoundingClientRect().height)
            .toBeCloseTo(plainAside.getBoundingClientRect().height, 1);
        expect(getComputedStyle(asideWithMusicOut, '::after').content).toBe('none');
        expect(musicOutWrapper).not.toBeNull();
        expect(getComputedStyle(musicOutWrapper!, '::after').content).toBe('")"');
    });

    it('keeps a note closing marker on its text line when the music ends there', async () => {
        renderEditor({
            type: 'doc',
            content: [
                createStageDirection('sd-1', [
                    {
                        type: 'musicStart',
                        attrs: {
                            musicId: 'music-1',
                            mode: 'open',
                            title: 'Night',
                            kind: null,
                            isDraft: false,
                        },
                    },
                ]),
                createNote('note-1', [{type: 'text', text: 'private'}, {type: 'musicOut'}]),
                createNote('note-2', [{type: 'text', text: 'private'}]),
            ],
        });

        const noteWithMusicOut = await poll(
            () => document.querySelector<HTMLElement>('[data-id="note-1"]'),
            'note with music end',
        );
        const plainNote = await poll(
            () => document.querySelector<HTMLElement>('[data-id="note-2"]'),
            'plain note',
        );
        const musicOutWrapper = noteWithMusicOut.querySelector<HTMLElement>('.node-musicOut');

        expect(noteWithMusicOut.getBoundingClientRect().height)
            .toBeCloseTo(plainNote.getBoundingClientRect().height, 1);
        expect(getComputedStyle(noteWithMusicOut, '::after').content).toBe('none');
        expect(musicOutWrapper).not.toBeNull();
        expect(getComputedStyle(musicOutWrapper!, '::after').content).toBe('"]]"');
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

    it('keeps endpoint navigation in the music rail instead of inline out text', async () => {
        renderEditor(createTwoBlockDocument(), {onOpenMusicManager: vi.fn()});

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night');
        editor.commands.insertMusicOut('sd-2');

        await activatePill();

        const startMenu = await poll(
            () => document.querySelector('[data-music-menu="start"]'),
            'start pill menu',
        );

        expect([...startMenu.querySelectorAll('button')].map(button => button.ariaLabel)).toEqual(['Manage music', 'Unassign music']);

        const endpoint = await poll(
            () => document.querySelector('[data-block-id="sd-2"][data-marker-kind="end"]'),
            'music rail endpoint',
        );

        expect((endpoint as HTMLElement).dataset.endTone).toBe('explicit');
    });

    it('opens one menu for a shared end and start marker', async () => {
        renderEditor(createTwoBlockDocument(), {onOpenMusicManager: vi.fn()});

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Overture', 'open', {musicId: 'first'});
        editor.commands.insertMusicStart('sd-2', 'Night', 'open', {musicId: 'second'});

        const marker = await poll(
            () => document.querySelector('[data-block-id="sd-2"][data-marker-kind="shared"]'),
            'shared music marker',
        );
        const ringStyle = getComputedStyle(marker, '::before');
        const dotStyle = getComputedStyle(marker, '::after');
        const ringInnerWidth = Number.parseFloat(ringStyle.width)
            - 2 * Number.parseFloat(ringStyle.borderLeftWidth);

        expect(ringInnerWidth).toBeGreaterThan(Number.parseFloat(dotStyle.width));

        await page.elementLocator(marker).click();

        const menu = await poll(
            () => document.querySelector('[data-music-rail-menu="true"]'),
            'shared music menu',
        );
        const labels = [...menu.querySelectorAll('[data-music-rail-section-label]')]
            .map(label => label.textContent);

        expect(labels).toEqual(['Ending: 0.A) Overture', 'Starting: 0.B) Night']);
    });

    it('renders one persistent range aligned with the start of its endpoint blocks', async () => {
        renderEditor(createThreeBlockDocument());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night', 'open', {musicId: 'music-1'});
        editor.commands.insertMusicOut('sd-3');

        const startMarker = await poll(
            () => document.querySelector<HTMLElement>('[data-start-music-id="music-1"]'),
            'music start marker',
        );
        const endMarker = await poll(
            () => document.querySelector<HTMLElement>('[data-end-music-id="music-1"]'),
            'music end marker',
        );
        const range = await poll(
            () => document.querySelector<HTMLElement>('[data-music-rail-range="music-1"]'),
            'persistent music range',
        );
        const startBlock = document.querySelector<HTMLElement>('[data-id="sd-1"]');
        const middleBlock = document.querySelector<HTMLElement>('[data-id="sd-2"]');
        const endBlock = document.querySelector<HTMLElement>('[data-id="sd-3"]');

        if (!startBlock || !middleBlock || !endBlock) {
            throw new Error('Music endpoint blocks not found');
        }

        const expectedMarkerY = (block: HTMLElement) => {
            const blockRect = block.getBoundingClientRect();
            const style = getComputedStyle(block);
            const paddingTop = Number.parseFloat(style.paddingTop) || 0;
            const lineHeight = Number.parseFloat(style.lineHeight);

            return blockRect.top + paddingTop + lineHeight / 2;
        };
        const startRect = startMarker.getBoundingClientRect();
        const endRect = endMarker.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect();

        expect(startRect.top + startRect.height / 2).toBeCloseTo(expectedMarkerY(startBlock), 0);
        expect(endRect.top + endRect.height / 2).toBeCloseTo(expectedMarkerY(endBlock), 0);
        expect(rangeRect.top).toBeCloseTo(startRect.top + startRect.height / 2, 0);
        expect(rangeRect.bottom).toBeCloseTo(endRect.top + endRect.height / 2, 0);
        expect(rangeRect.left + rangeRect.width / 2).toBeCloseTo(startRect.left + startRect.width / 2, 0);

        await page.elementLocator(middleBlock).click();

        const activeTrigger = await poll(
            () => document.querySelector<HTMLElement>('[data-music-rail-active-trigger="true"][data-block-id="sd-2"]'),
            'middle block music trigger',
        );
        const triggerRect = activeTrigger.getBoundingClientRect();

        expect(triggerRect.left + triggerRect.width / 2).toBeCloseTo(startRect.left + startRect.width / 2, 0);
        expect(Math.abs(
            triggerRect.top + triggerRect.height / 2 - expectedMarkerY(middleBlock),
        )).toBeLessThan(1);
    });

    it('does not render a global rail line when the document has no music range', async () => {
        renderEditor();

        const editor = await getEditor();
        const content = editor.view.dom.parentElement;

        expect(content).not.toBeNull();
        expect(getComputedStyle(content!, '::after').content).toBe('none');
        expect(document.querySelector('[data-music-rail-range]')).toBeNull();
    });

    it('moves an orphan out to a valid song boundary atomically', async () => {
        renderEditor(createOrphanDragDocument());

        const editor = await getEditor();
        const transactions: number[] = [];
        const handleTransaction = ({transaction}: {transaction: {docChanged: boolean}}) => {
            if (transaction.docChanged) {
                transactions.push(1);
            }
        };

        editor.on('transaction', handleTransaction);

        expect(editor.commands.moveOrphanMusicOut('sd-1', 'sd-3')).toBe(true);

        editor.off('transaction', handleTransaction);

        expect(document.querySelector('[data-id="sd-1"] [data-music-pill="out"]')).toBeNull();
        expect(document.querySelector('[data-id="sd-3"] [data-music-pill="out"]')).toBeTruthy();
        expect(transactions).toHaveLength(1);
    });

    it('drags an explicit end to another valid boundary', async () => {
        renderEditor(createThreeBlockDocument());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night', 'open', {musicId: 'music-1'});
        editor.commands.insertMusicOut('sd-2');

        const source = await poll(
            () => document.querySelector<HTMLElement>('[data-block-id="sd-2"][data-marker-kind="end"]'),
            'explicit end marker',
        );
        const target = await poll(
            () => document.querySelector<HTMLElement>('[data-id="sd-3"]'),
            'target block',
        );
        const capture = vi.spyOn(source, 'setPointerCapture').mockImplementation(() => undefined);
        const elements = vi.spyOn(document, 'elementsFromPoint').mockReturnValue([target]);

        source.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, pointerId: 1, button: 0, clientX: 10, clientY: 10,
        }));
        source.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true, pointerId: 1, buttons: 1, clientX: 30, clientY: 30,
        }));

        const preview = document.querySelector<HTMLElement>(
            '[data-music-rail-drop-preview="true"][data-block-id="sd-3"]',
        );

        expect(preview).not.toBeNull();

        source.dispatchEvent(new PointerEvent('pointerup', {
            bubbles: true, pointerId: 1, button: 0, clientX: 30, clientY: 30,
        }));

        capture.mockRestore();
        elements.mockRestore();

        expect(document.querySelector('[data-id="sd-2"] [data-music-pill="out"]')).toBeNull();
        expect(document.querySelector('[data-id="sd-3"] [data-music-pill="out"]')).toBeTruthy();
        expect(document.querySelector('[data-music-rail-drop-preview="true"]')).toBeNull();
        expect(document.querySelector('[data-music-rail-drop-target="true"]')).toBeNull();
        expect(document.querySelector('[data-music-rail-drop-range-preview="true"]')).toBeNull();
    });

    it('shows eligible endpoints and the prospective range while dragging a music end', async () => {
        renderEditor(createFourBlockDocument());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night', 'open', {musicId: 'music-1'});
        editor.commands.insertMusicOut('sd-2');

        const source = await poll(
            () => document.querySelector<HTMLElement>('[data-block-id="sd-2"][data-marker-kind="end"]'),
            'explicit end marker',
        );
        const target = await poll(
            () => document.querySelector<HTMLElement>('[data-id="sd-4"]'),
            'target block',
        );
        const start = await poll(
            () => document.querySelector<HTMLElement>('[data-start-music-id="music-1"]'),
            'music start marker',
        );
        const capture = vi.spyOn(source, 'setPointerCapture').mockImplementation(() => undefined);
        const elements = vi.spyOn(document, 'elementsFromPoint').mockReturnValue([target]);

        source.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, pointerId: 1, button: 0, clientX: 10, clientY: 10,
        }));

        const dropTargets = Array.from(
            document.querySelectorAll<HTMLElement>('[data-music-rail-drop-target="true"]'),
        );
        const canvas = document.querySelector<HTMLElement>('[data-editor-scroll-container="true"]');
        const neutralReference = document.createElement('span');

        expect(dropTargets.map(marker => marker.dataset.blockId)).toEqual(['sd-3', 'sd-4']);

        neutralReference.style.background = 'color-mix(in oklch, var(--color-text-muted) 38%, transparent)';
        canvas?.appendChild(neutralReference);

        expect(getComputedStyle(dropTargets[0]).backgroundColor)
            .toBe(getComputedStyle(neutralReference).backgroundColor);

        neutralReference.remove();

        source.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true, pointerId: 1, buttons: 1, clientX: 30, clientY: 30,
        }));

        const rangePreview = document.querySelector<HTMLElement>(
            '[data-music-rail-drop-range-preview="true"]',
        );

        expect(rangePreview).not.toBeNull();

        const startRect = start.getBoundingClientRect();
        const targetPreview = document.querySelector<HTMLElement>(
            '[data-music-rail-drop-preview="true"][data-block-id="sd-4"]',
        );

        if (!rangePreview || !targetPreview) {
            throw new Error('Music range drag preview not found');
        }

        const canvasRect = canvas?.getBoundingClientRect();
        const targetRect = targetPreview.getBoundingClientRect();

        if (!canvas || !canvasRect) {
            throw new Error('Editor canvas not found');
        }

        const expectedTop = startRect.top - canvasRect.top + canvas.scrollTop + startRect.height / 2;
        const expectedBottom = targetRect.top - canvasRect.top + canvas.scrollTop + targetRect.height / 2;

        expect(Number.parseFloat(rangePreview.style.top)).toBeCloseTo(expectedTop, 0);
        expect(Number.parseFloat(rangePreview.style.height)).toBeCloseTo(expectedBottom - expectedTop, 0);

        document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));

        capture.mockRestore();
        elements.mockRestore();

        expect(document.querySelector('[data-music-rail-drop-target="true"]')).toBeNull();
        expect(document.querySelector('[data-music-rail-drop-preview="true"]')).toBeNull();
        expect(document.querySelector('[data-music-rail-drop-range-preview="true"]')).toBeNull();
    });

    it('keeps the drop preview on the block containing the pointer vertically', async () => {
        renderEditor(createFourBlockDocument());

        const editor = await getEditor();

        editor.commands.insertMusicStart('sd-1', 'Night', 'open', {musicId: 'music-1'});
        editor.commands.insertMusicOut('sd-2');

        const source = await poll(
            () => document.querySelector<HTMLElement>('[data-block-id="sd-2"][data-marker-kind="end"]'),
            'explicit end marker',
        );
        const canvas = document.querySelector<HTMLElement>('[data-editor-scroll-container="true"]');
        const blocks = await Promise.all([
            'sd-1',
            'sd-2',
            'sd-3',
            'sd-4',
        ].map(blockId => {
            return poll(
                () => document.querySelector<HTMLElement>(`[data-id="${blockId}"]`),
                `${blockId} geometry block`,
            );
        }));

        if (!canvas) {
            throw new Error('Music drag canvas not found');
        }

        const blockRects = [
            new DOMRect(0, 0, 100, 20),
            new DOMRect(0, 30, 100, 20),
            new DOMRect(0, 100, 100, 180),
            new DOMRect(0, 300, 100, 20),
        ];
        const rectSpies = blocks.map((block, index) => {
            return vi.spyOn(block, 'getBoundingClientRect').mockReturnValue(blockRects[index]);
        });
        const capture = vi.spyOn(source, 'setPointerCapture').mockImplementation(() => undefined);
        const elements = vi.spyOn(document, 'elementsFromPoint').mockReturnValue([canvas]);

        source.dispatchEvent(new PointerEvent('pointerdown', {
            bubbles: true, pointerId: 1, button: 0, clientX: 10, clientY: 40,
        }));
        source.dispatchEvent(new PointerEvent('pointermove', {
            bubbles: true, pointerId: 1, buttons: 1, clientX: 30, clientY: 260,
        }));

        expect(document.querySelector(
            '[data-music-rail-drop-preview="true"][data-block-id="sd-3"]',
        )).not.toBeNull();

        source.dispatchEvent(new PointerEvent('pointercancel', {
            bubbles: true, pointerId: 1,
        }));

        rectSpies.forEach(spy => spy.mockRestore());
        capture.mockRestore();
        elements.mockRestore();

        expect(document.querySelector('[data-music-rail-drop-target="true"]')).toBeNull();
        expect(document.querySelector('[data-music-rail-drop-preview="true"]')).toBeNull();
        expect(document.querySelector('[data-music-rail-drop-range-preview="true"]')).toBeNull();
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
        await clickMenuButton('Unassign music');
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
        await clickMenuButton('Unassign music');
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
        await userEvent.keyboard('{Enter}');

        const content = editor.getJSON().content as ScriptNode[] | undefined;

        expect(content?.length).toBe(2);
        expect(musicOwnerBlockId(editor)).toBe('sd-1');
        expect(content?.[1]?.type).toBe('character');
        expect(getEmptyEnterChooserFromState(editor.state).isOpen).toBe(false);
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
