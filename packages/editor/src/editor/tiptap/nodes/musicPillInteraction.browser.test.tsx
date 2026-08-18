import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {
    page,
    userEvent,
} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type TestWindow = Window & {__musicPillInteractionEditor?: Editor | null};

const initialValue: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'stage-direction-1'},
            content: [
                {
                    type: 'text',
                    text: 'Lights\u00A0fade\u00A0slowly\u00A0across\u00A0the\u00A0empty\u00A0stage ',
                }, {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'music-1',
                        mode: 'open',
                        title: 'Overture',
                        kind: 'instrumental',
                    },
                },
            ],
        },
    ],
};

const emptyInitialValue: ScriptDocument = {
    type: 'doc',
    content: [{
        type: 'stageDirection',
        attrs: {id: 'stage-direction-empty'},
    }],
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as TestWindow).__musicPillInteractionEditor = editor;

        return () => {
            delete (window as TestWindow).__musicPillInteractionEditor;
        };
    }, [editor]);

    return null;
};

const roots: Root[] = [];

const renderEditor = (documentValue: ScriptDocument = initialValue) => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{initialValue: documentValue}}
            layout={{autoFocus: true}}
            callbacks={{onOpenMusicManager: vi.fn()}}
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    roots.push(root);
};

const poll = async <T, >(getValue: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const getEditor = () => {
    return poll(
        () => (window as TestWindow).__musicPillInteractionEditor ?? null,
        'editor instance',
    );
};

const getPillElements = async (editor: Editor) => {
    const input = await poll(
        () => editor.view.dom.querySelector<HTMLElement>('[data-music-title-input="start"]'),
        'music title input',
    );
    const pill = input.closest<HTMLElement>('[data-music-pill="start"]');
    const visualBody = input.parentElement;

    if (!pill || !visualBody) {
        throw new Error('Music pill structure not found');
    }

    return {
        input,
        pill,
        visualBody,
    };
};

const constrainBlockUntilPillWraps = async (visualBody: HTMLElement) => {
    const block = visualBody.closest<HTMLElement>('[data-id="stage-direction-1"]');

    if (!block) {
        throw new Error('Stage direction block not found');
    }

    const textNode = block.firstChild;

    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
        throw new Error('Stage direction text node not found');
    }

    const range = document.createRange();
    const textLength = textNode.textContent?.length ?? 0;

    range.setStart(textNode, 0);
    range.setEnd(textNode, textLength);

    const textWidth = range.getBoundingClientRect().width;
    const blockRect = block.getBoundingClientRect();
    const scale = block.offsetWidth > 0 ? blockRect.width / block.offsetWidth : 1;
    const style = document.createElement('style');

    style.dataset.musicPillTestStyle = 'true';
    style.textContent = `[data-id="stage-direction-1"] { width: ${Math.max(1, Math.floor(textWidth / scale - 8))}px !important; }`;
    document.head.appendChild(style);
    await new Promise(resolve => window.requestAnimationFrame(resolve));

    if (visualBody.getBoundingClientRect().top <= range.getBoundingClientRect().top) {
        throw new Error('Music pill did not wrap to a new line');
    }
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    document.querySelectorAll('[data-music-pill-test-style]').forEach(element => element.remove());
    delete (window as TestWindow).__musicPillInteractionEditor;
});

describe('music pill interaction', () => {
    it('anchors a wrapped native popover to the visual music pill', async () => {
        renderEditor();

        const editor = await getEditor();
        const {
            input,
            visualBody,
        } = await getPillElements(editor);

        await constrainBlockUntilPillWraps(visualBody);
        await page.elementLocator(input).click();
        await poll(
            () => editor.view.dom.querySelector('[data-music-active="true"]'),
            'active music pill',
        );

        const menu = await poll(
            () => {
                const candidate = editor.view.dom.querySelector<HTMLElement>('[data-music-menu="start"]');

                return candidate?.matches(':popover-open') ? candidate : null;
            },
            'open music menu',
        );
        const currentVisualBody = menu.closest('[data-music-pill="start"]')
            ?.querySelector<HTMLElement>('[data-music-title-input="start"]')
            ?.parentElement;

        if (!currentVisualBody) {
            throw new Error('Active music pill body not found');
        }

        expect(menu.getBoundingClientRect().bottom).toBeLessThanOrEqual(
            currentVisualBody.getBoundingClientRect().top,
        );
    });

    it('closes the native popover through Escape and clears active state', async () => {
        renderEditor();

        const editor = await getEditor();
        const {input} = await getPillElements(editor);

        await page.elementLocator(input).click();

        const menu = await poll(
            () => {
                const candidate = editor.view.dom.querySelector<HTMLElement>('[data-music-menu="start"]');

                return candidate?.matches(':popover-open') ? candidate : null;
            },
            'open music menu',
        );
        const pill = menu.closest<HTMLElement>('[data-music-pill="start"]');
        const button = menu.querySelector<HTMLButtonElement>('button');

        if (!pill || !button) {
            throw new Error('Active music menu not found');
        }

        button.focus();
        await userEvent.keyboard('{Escape}');
        await poll(() => menu.matches(':popover-open') ? null : true, 'closed music menu');

        expect(pill.dataset.musicActive).toBeUndefined();
    });

    it('uses manual popover mode so the activation gesture cannot light-dismiss it', async () => {
        renderEditor();

        const editor = await getEditor();
        const {visualBody} = await getPillElements(editor);
        const number = visualBody.querySelector<HTMLElement>('[data-music-number]');

        if (!number) {
            throw new Error('Music number not found');
        }

        number.dispatchEvent(new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
        }));

        const menu = await poll(
            () => {
                const candidate = editor.view.dom.querySelector<HTMLElement>('[data-music-menu="start"]');

                return candidate?.matches(':popover-open') ? candidate : null;
            },
            'open music menu during pointer activation',
        );

        number.dispatchEvent(new MouseEvent('click', {bubbles: true}));
        await new Promise(resolve => window.requestAnimationFrame(resolve));

        expect(menu.matches(':popover-open')).toBe(true);
        expect(menu.getAttribute('popover')).toBe('manual');
    });

    it('allows the complete visible pill to participate in text selection', async () => {
        renderEditor();

        const editor = await getEditor();
        const {
            input,
            visualBody,
        } = await getPillElements(editor);
        const number = visualBody.querySelector<HTMLElement>('[data-music-number]');
        const block = editor.state.doc.firstChild;

        if (!number || !block) {
            throw new Error('Music pill content not found');
        }

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            1,
            1 + block.content.size,
        )));
        await new Promise(resolve => window.requestAnimationFrame(resolve));

        const selection = window.getSelection();

        expect(selection?.containsNode(number, true)).toBe(true);
        expect(selection?.containsNode(input, true)).toBe(true);
        expect(getComputedStyle(visualBody).userSelect).toBe('text');
    });

    it('does not render the active music placeholder outside the pill', async () => {
        renderEditor();

        const editor = await getEditor();
        const {input} = await getPillElements(editor);

        await page.elementLocator(input).click();
        await poll(() => input.dataset.placeholder === 'music' ? input : null, 'active music placeholder');

        const placeholderStyle = getComputedStyle(input, '::before');

        expect(placeholderStyle.content).toBe('none');
        expect(placeholderStyle.float).toBe('none');
    });

    it('keeps an empty music draft placeholder inside the pill', async () => {
        renderEditor(emptyInitialValue);

        const editor = await getEditor();

        expect(editor.commands.insertMusicDraft('stage-direction-empty')).toBe(true);

        const input = await poll(
            () => editor.view.dom.querySelector<HTMLElement>('[data-music-title-input="start"]'),
            'draft music title input',
        );
        await poll(() => document.activeElement === input ? input : null, 'focused draft music title');

        const placeholderStyle = getComputedStyle(input, '::before');

        expect(placeholderStyle.content).toBe('"music"');
        expect(placeholderStyle.float).toBe('none');
    });
});
