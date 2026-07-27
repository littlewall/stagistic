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

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type TestWindow = Window & {__clipboardEditor?: Editor | null};

const initialValue: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene-1'},
            content: [{type: 'text', text: 'Scene'}],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'stage-direction-1'},
            content: [
                {type: 'text', text: 'Enter '},
                {
                    type: 'text',
                    text: 'REBeccA',
                    marks: [
                        {
                            type: 'characterTag',
                            attrs: {
                                characterKey: 'REBECCA',
                                characterId: 'character-1',
                            },
                        },
                    ],
                },
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'music-1',
                        mode: 'open',
                        title: 'Overture',
                        kind: 'instrumental',
                    },
                },
                {type: 'musicOut', attrs: {musicId: 'music-1'}},
                {type: 'text', text: ' Exit.'},
            ],
        },
        {
            type: 'stageDirection',
            attrs: {id: 'paste-target'},
        },
    ],
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as TestWindow).__clipboardEditor = editor;

        return () => {
            delete (window as TestWindow).__clipboardEditor;
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

const getEditor = async () => {
    const deadline = Date.now() + 2_000;

    while (Date.now() < deadline) {
        const editor = (window as TestWindow).__clipboardEditor;

        if (editor) {
            return editor;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for editor');
};

const findTextNode = (
    nodes: readonly ScriptNode[],
    text: string,
): ScriptNode | undefined => {
    for (const node of nodes) {
        if (node.text?.includes(text)) {
            return node;
        }

        const child = node.content ? findTextNode(node.content, text) : undefined;

        if (child) {
            return child;
        }
    }

    return undefined;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    delete (window as TestWindow).__clipboardEditor;
});

describe('script clipboard transformation', () => {
    it('copies music start as bold visible text, omits OUT, and preserves character tags', async () => {
        renderEditor();

        const editor = await getEditor();
        let blockPos: number | undefined;
        let blockSize = 0;

        editor.state.doc.descendants((node, pos) => {
            if (node.attrs.id === 'stage-direction-1') {
                blockPos = pos;
                blockSize = node.nodeSize;

                return false;
            }

            return true;
        });

        if (blockPos === undefined) {
            throw new Error('Stage direction not found');
        }

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            blockPos + 1,
            blockPos + blockSize - 1,
        )));

        const source = editor.state.selection.content();
        const copied = editor.view.someProp(
            'transformCopied',
            transform => transform(source, editor.view),
        );

        expect(copied).toBeTruthy();

        if (!copied) {
            return;
        }

        const json = copied.content.toJSON() as ScriptNode[];
        const serialized = JSON.stringify(json);
        const musicText = findTextNode(json, 'Overture');
        const characterText = findTextNode(json, 'REBeccA');
        const plainText = copied.content.textBetween(0, copied.content.size, '\n');

        expect(serialized).not.toContain('"musicStart"');
        expect(serialized).not.toContain('"musicOut"');
        expect(plainText).toContain('1) Overture');
        expect(musicText?.marks).toContainEqual(expect.objectContaining({type: 'bold'}));
        expect(characterText?.marks).toContainEqual(expect.objectContaining({
            type: 'characterTag',
        }));
    });

    it('copies and pastes a visually selected music pill through real clipboard events', async () => {
        renderEditor();

        const editor = await getEditor();
        const block = editor.view.dom.querySelector<HTMLElement>('[data-id="stage-direction-1"]');
        const title = block?.querySelector<HTMLElement>('[data-music-title-input="start"]');
        const startText = block?.firstChild;
        const titleText = title?.firstChild;

        if (
            !block
            || !title
            || !startText
            || startText.nodeType !== Node.TEXT_NODE
            || !titleText
            || titleText.nodeType !== Node.TEXT_NODE
        ) {
            throw new Error('Rendered clipboard selection fixtures not found');
        }

        const range = document.createRange();
        const selection = window.getSelection();

        range.setStart(startText, 0);
        range.setEnd(titleText, titleText.textContent?.length ?? 0);
        selection?.removeAllRanges();
        selection?.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        await new Promise(resolve => window.requestAnimationFrame(resolve));

        const clipboardData = new DataTransfer();
        const event = new ClipboardEvent('copy', {
            bubbles: true,
            cancelable: true,
            clipboardData,
        });

        editor.view.dom.dispatchEvent(event);

        expect(clipboardData.getData('text/plain')).toContain('1) Overture');
        expect(clipboardData.getData('text/html')).toContain('<strong> 1) Overture </strong>');
        expect(clipboardData.getData('text/plain')).toContain('REBECCA');
        expect(clipboardData.getData('text/html')).toContain('data-character-key="REBECCA"');
        expect(clipboardData.getData('text/html')).toContain('>REBECCA</span>');
        expect(clipboardData.getData('text/html')).not.toContain('node-musicStart');
        expect(clipboardData.getData('text/html')).not.toContain('contenteditable="false"');

        let targetPos: number | undefined;

        editor.state.doc.descendants((node, pos) => {
            if (node.attrs.id === 'paste-target') {
                targetPos = pos;

                return false;
            }

            return true;
        });

        if (targetPos === undefined) {
            throw new Error('Paste target not found');
        }

        editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(
            editor.state.doc,
            targetPos + 1,
        )));
        editor.view.dom.dispatchEvent(new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData,
        }));
        await new Promise(resolve => window.requestAnimationFrame(resolve));

        const pastedBlock = (editor.getJSON().content as ScriptNode[] | undefined)
            ?.find(node => node.attrs?.id === 'paste-target');
        const pastedMusicText = findTextNode(pastedBlock?.content ?? [], 'Overture');
        const pastedCharacter = findTextNode(pastedBlock?.content ?? [], 'REBECCA');

        expect(pastedMusicText?.text).toContain('1) Overture');
        expect(pastedMusicText?.marks).toContainEqual(expect.objectContaining({type: 'bold'}));
        expect(pastedCharacter?.marks).toContainEqual(expect.objectContaining({
            type: 'characterTag',
        }));
    });
});
