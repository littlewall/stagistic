import '@stagistic/ui/styles/base.css';

import {NodeSelection} from '@tiptap/pm/state';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

let root: Root | undefined;
let editor: Editor | null = null;
const Probe = () => {
    const instance = useEditorInstance();

    useEffect(() => {
        editor = instance;
    }, [instance]);

    return null;
};
const mount = async () => {
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(
        <ScriptEditor
            document={{initialValue: {
                type: 'doc',
                content: [
                    {
                        type: 'scene',
                        attrs: {id: 'heading'},
                        content: [{type: 'text', text: 'Kitchen'}],
                    },
                    {
                        type: 'stageDirection',
                        attrs: {id: 'action'},
                        content: [{type: 'text', text: 'Wait.'}],
                    },
                ],
            }}}
        >
            <ScriptEditor.LeftSidebar><Probe /></ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    await expect.poll(() => editor).not.toBeNull();

    if (!editor) throw new Error('Editor unavailable');

    return editor;
};
const headings = (instance: Editor) => {
    const ids: string[] = [];

    instance.state.doc.forEach(node => {
        if (node.attrs.blockType === 'scene' || node.type.name === 'scene') ids.push(node.attrs.id as string);
    });

    return ids;
};

afterEach(() => {
    root?.unmount();
    editor = null;
    document.body.innerHTML = '';
});

describe('scene clipboard identity', () => {
    it('gives a copied heading a new id', async () => {
        const instance = await mount();

        instance.view.dispatch(instance.state.tr.setSelection(NodeSelection.create(instance.state.doc, 0)));

        const clipboardData = new DataTransfer();

        instance.view.dom.dispatchEvent(new ClipboardEvent('copy', {
            bubbles: true,
            cancelable: true,
            clipboardData,
        }));
        instance.commands.setTextSelection(instance.state.doc.content.size - 1);
        instance.view.dom.dispatchEvent(new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData,
        }));
        await expect.poll(() => headings(instance).length).toBe(2);
        expect(headings(instance)[0]).toBe('heading');
        expect(headings(instance)[1]).not.toBe('heading');
    });

    it('guards cutting out a heading; pasting the clipboard still creates a new identity', async () => {
        const instance = await mount();

        instance.view.dispatch(instance.state.tr.setSelection(NodeSelection.create(instance.state.doc, 0)));

        const clipboardData = new DataTransfer();

        instance.view.dom.dispatchEvent(new ClipboardEvent('cut', {
            bubbles: true,
            cancelable: true,
            clipboardData,
        }));
        expect(headings(instance)).toEqual(['heading']);
        instance.commands.setTextSelection(instance.state.doc.content.size - 1);
        instance.view.dom.dispatchEvent(new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData,
        }));
        await expect.poll(() => headings(instance).length).toBe(2);
        expect(headings(instance)[1]).not.toBe('heading');
    });
});
