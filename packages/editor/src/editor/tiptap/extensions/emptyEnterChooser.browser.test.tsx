import type {ScriptDocument} from '@stagistic/script';
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
import {handleKeyDown} from '../scriptBlock/handlers';
import {getEmptyEnterChooserFromState} from './EmptyEnterChooserExtension';

type TestWindow = Window & {__emptyEnterChooserTestEditor?: Editor | null};

const initialValue: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'stageDirection',
            attrs: {id: 'stage-direction-1'},
        },
    ],
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as TestWindow).__emptyEnterChooserTestEditor = editor;

        return () => {
            delete (window as TestWindow).__emptyEnterChooserTestEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <ScriptEditor document={{initialValue}} layout={{autoFocus: true}}>
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    mountedRoots.push(root);
};

const getEditor = async (): Promise<Editor> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const editor = (window as TestWindow).__emptyEnterChooserTestEditor;

        if (editor) {
            return editor;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error('Timed out waiting for editor instance');
};

const getElement = async <ElementType extends Element>(
    selector: string,
    label: string,
): Promise<ElementType> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const element = document.querySelector<ElementType>(selector);

        if (element) {
            return element;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('empty Enter chooser', () => {
    it('offers only block types that begin a script section', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.openEmptyEnterChooser({
            blockId: 'stage-direction-1',
            blockPos: 0,
            blockType: 'stageDirection',
        });

        const chooser = await getElement<HTMLElement>(
            '[aria-label="Empty block type chooser"]',
            'empty Enter chooser',
        );
        const labels = [...chooser.querySelectorAll<HTMLButtonElement>('button')]
            .map(button => button.ariaLabel);

        expect(labels).toEqual([
            'Set block type to Scene',
            'Set block type to Stage direction',
            'Set block type to Character',
        ]);
    });

    it('aligns its left edge with the active block instead of its gutter trigger', async () => {
        renderEditor();

        const editor = await getEditor();
        const block = editor.view.nodeDOM(0);

        if (!(block instanceof HTMLElement)) {
            throw new Error('Script block not found');
        }

        await getElement<HTMLButtonElement>(
            '[data-block-actions-trigger="true"][data-block-id="stage-direction-1"]',
            'block type trigger',
        );

        editor.commands.openEmptyEnterChooser({
            blockId: 'stage-direction-1',
            blockPos: 0,
            blockType: 'stageDirection',
        });

        const chooser = await getElement<HTMLElement>(
            '[aria-label="Empty block type chooser"]',
            'empty Enter chooser',
        );

        expect(chooser.getBoundingClientRect().left)
            .toBeCloseTo(block.getBoundingClientRect().left, 1);
    });

    it('confirms the selection without dispatching a stale command transaction', async () => {
        renderEditor();

        const editor = await getEditor();

        editor.commands.openEmptyEnterChooser({
            blockId: 'stage-direction-1',
            blockPos: 0,
            blockType: 'stageDirection',
        });

        expect(() => {
            handleKeyDown(editor, new KeyboardEvent('keydown', {
                key: 'Enter',
                cancelable: true,
            }));
        }).not.toThrow();
        expect(editor.state.doc.childCount).toBe(2);
        expect(getEmptyEnterChooserFromState(editor.state).isOpen).toBe(false);
    });
});
