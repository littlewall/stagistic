import '@stagistic/ui/styles/base.css';

import type {ScriptDocument} from '@stagistic/script';
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

type TestWindow = Window & {__visibleClipboardEditor?: Editor | null};

const initialValue: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene-casing'},
            content: [{type: 'text', text: 'ScEnE MiXeD'}],
        }, {
            type: 'dialogue',
            attrs: {id: 'dialogue-casing'},
            content: [{type: 'text', text: 'DiAlOgUe MiXeD'}],
        },
    ],
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as TestWindow).__visibleClipboardEditor = editor;

        return () => {
            delete (window as TestWindow).__visibleClipboardEditor;
        };
    }, [editor]);

    return null;
};

const roots: Root[] = [];

const renderEditor = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <ScriptEditor document={{initialValue}}>
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    roots.push(root);
};

const poll = async <T, >(read: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
        const value = read();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const copyBlock = async (blockId: string, textTransform: 'uppercase' | 'lowercase') => {
    const editor = await poll(
        () => (window as TestWindow).__visibleClipboardEditor,
        'editor',
    );
    const block = await poll(
        () => editor.view.dom.querySelector<HTMLElement>(`[data-id="${blockId}"]`),
        blockId,
    );
    const selection = window.getSelection();
    const range = document.createRange();

    block.style.textTransform = textTransform;
    range.selectNodeContents(block);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const clipboardData = new DataTransfer();

    editor.view.dom.dispatchEvent(new ClipboardEvent('copy', {
        bubbles: true,
        cancelable: true,
        clipboardData,
    }));

    return clipboardData;
};

const copyAcrossBlocks = async () => {
    const editor = await poll(
        () => (window as TestWindow).__visibleClipboardEditor,
        'editor',
    );
    const scene = editor.view.dom.querySelector<HTMLElement>('[data-id="scene-casing"]');
    const dialogue = editor.view.dom.querySelector<HTMLElement>('[data-id="dialogue-casing"]');
    const sceneText = scene?.firstChild;
    const dialogueText = dialogue?.firstChild;

    if (!scene || !dialogue || !sceneText || !dialogueText) {
        throw new Error('Cross-block copy fixtures not found');
    }

    scene.style.textTransform = 'uppercase';
    dialogue.style.textTransform = 'lowercase';

    const selection = window.getSelection();
    const range = document.createRange();

    range.setStart(sceneText, 0);
    range.setEnd(dialogueText, dialogueText.textContent?.length ?? 0);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const clipboardData = new DataTransfer();

    editor.view.dom.dispatchEvent(new ClipboardEvent('copy', {
        bubbles: true,
        cancelable: true,
        clipboardData,
    }));

    return clipboardData;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    delete (window as TestWindow).__visibleClipboardEditor;
});

describe('visible script clipboard text', () => {
    it('copies uppercase blocks exactly as rendered', async () => {
        renderEditor();

        const clipboardData = await copyBlock('scene-casing', 'uppercase');

        expect(clipboardData.getData('text/plain')).toBe('SCENE MIXED');
        expect(clipboardData.getData('text/html')).toContain('SCENE MIXED');
    });

    it('copies lowercase blocks exactly as rendered', async () => {
        renderEditor();

        const clipboardData = await copyBlock('dialogue-casing', 'lowercase');

        expect(clipboardData.getData('text/plain')).toBe('dialogue mixed');
        expect(clipboardData.getData('text/html')).toContain('dialogue mixed');
    });

    it('keeps visible casing and line breaks across blocks', async () => {
        renderEditor();

        const clipboardData = await copyAcrossBlocks();

        expect(clipboardData.getData('text/plain')).toBe('SCENE MIXED\ndialogue mixed');
    });
});
