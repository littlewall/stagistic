import '@stagistic/ui/styles/base.css';

import type {
    ScriptDocument,
    ScriptNode,
} from '@stagistic/script';
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

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';
import {BLOCK_FOCUS_FLASH_ATTRIBUTE} from './BlockFocusFlashExtension';

type FlashTestWindow = Window & {__blockFocusFlashTestEditor?: Editor | null};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene', attrs: {id}, content: [{type: 'text', text}],
});

const dialogue = (id: string, text: string): ScriptNode => ({
    type: 'dialogue', attrs: {id}, content: [{type: 'text', text}],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as FlashTestWindow).__blockFocusFlashTestEditor = editor;

        return () => {
            delete (window as FlashTestWindow).__blockFocusFlashTestEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = (initialValue: ScriptDocument) => {
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

const poll = async <T, >(get: () => T | null | undefined, label: string, timeoutMs = 2000) => {
    const deadline = Date.now() + timeoutMs;

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

const getEditor = () => poll(
    () => (window as FlashTestWindow).__blockFocusFlashTestEditor ?? null,
    'editor instance',
);

const blockElement = (editor: Editor, blockId: string) => {
    return editor.view.dom.querySelector<HTMLElement>(`[data-id = '${blockId}']`);
};

const flashPhase = (editor: Editor, blockId: string) => {
    return blockElement(editor, blockId)?.getAttribute(BLOCK_FOCUS_FLASH_ATTRIBUTE) ?? null;
};

/*
 * The attribute alone proves nothing — the block has to actually be painted.
 * A flash whose keyframes never run still carries a perfectly correct
 * `data-focus-flash`, which is exactly how the first cut of this shipped blank.
 */
const isTinted = (editor: Editor, blockId: string) => {
    const element = blockElement(editor, blockId);

    if (!element) {
        return false;
    }

    const {backgroundColor} = window.getComputedStyle(element);

    return backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent';
};

const twoBlockDocument = (): ScriptDocument => ({
    type: 'doc',
    content: [scene('s1', 'INT. HOUSE'), dialogue('d1', 'Hello.')],
});

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('block focus flash extension', () => {
    it('tints only the flashed block and clears the tint on its own', async () => {
        renderEditor(twoBlockDocument());

        const editor = await getEditor();

        await poll(() => blockElement(editor, 's1'), 'scene block element');

        expect(editor.commands.flashBlockFocus('s1')).toBe(true);
        expect(flashPhase(editor, 's1')).toBe('a');
        expect(flashPhase(editor, 'd1')).toBeNull();

        expect(isTinted(editor, 's1')).toBe(true);
        expect(isTinted(editor, 'd1')).toBe(false);

        // The plugin owns the timer; 3s of hold + fade, then nothing is left.
        await poll(() => flashPhase(editor, 's1') === null ? true : null, 'flash to clear', 6000);
        expect(isTinted(editor, 's1')).toBe(false);
    });

    it('alternates the phase so re-flashing the same block replays the animation', async () => {
        renderEditor(twoBlockDocument());

        const editor = await getEditor();

        await poll(() => blockElement(editor, 'd1'), 'dialogue block element');

        editor.commands.flashBlockFocus('d1');
        expect(flashPhase(editor, 'd1')).toBe('a');

        editor.commands.flashBlockFocus('d1');
        expect(flashPhase(editor, 'd1')).toBe('b');
    });

    it('reports an unknown block instead of flashing', async () => {
        renderEditor(twoBlockDocument());

        const editor = await getEditor();

        await poll(() => blockElement(editor, 's1'), 'scene block element');

        expect(editor.commands.flashBlockFocus('missing')).toBe(false);
    });
});
