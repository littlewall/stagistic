import '@stagistic/ui/styles/base.css';

import {
    createDefaultScriptDocument,
    type ScriptDocument,
} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {useEditorInstance} from '../context';
import ScriptEditor from '../Editor';
import {getActiveScriptBlockFromState} from '../tiptap/scriptCore';

type LifecycleTestWindow = Window & {__lifecycleTestEditor?: Editor | null};

const mountedRoots: Root[] = [];

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as LifecycleTestWindow).__lifecycleTestEditor = editor;

        return () => {
            delete (window as LifecycleTestWindow).__lifecycleTestEditor;
        };
    }, [editor]);

    return null;
};

const poll = async <T, >(get: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = get();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const renderEditor = (
    initialValue: ScriptDocument = createDefaultScriptDocument('scene-1'),
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
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    mountedRoots.push(root);
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    delete (window as LifecycleTestWindow).__lifecycleTestEditor;
    document.body.innerHTML = '';
});

describe('useEditorLifecycle', () => {
    it('numbers every scene in structure order without storing the numbers', async () => {
        const scriptDocument = createDefaultScriptDocument('scene-1');

        scriptDocument.content.push(
            {
                type: 'stageDirection',
                attrs: {id: 'stage-direction-1'},
                content: [{type: 'text', text: 'Blackout.'}],
            },
            {
                type: 'act',
                attrs: {id: 'act-2'},
                content: [{type: 'text', text: 'Act Two'}],
            },
            {
                type: 'scene',
                attrs: {id: 'scene-2'},
                content: [{type: 'text', text: 'Night'}],
            },
        );
        renderEditor(scriptDocument);

        const editor = await poll(
            () => (window as LifecycleTestWindow).__lifecycleTestEditor,
            'editor instance',
        );

        await poll(
            () => document.querySelectorAll('p[blocktype="scene"]').length === 2 ? true : null,
            'scene blocks',
        );

        const sceneBlocks = Array.from(document.querySelectorAll<HTMLElement>('p[blocktype="scene"]'));
        const savedScenes = editor.getJSON().content?.filter(node => node.type === 'scene') ?? [];
        const firstScene = sceneBlocks[0];

        expect(firstScene).not.toBeUndefined();

        /*
         * The number is a computed label rendered as a `::before` from the
         * `data-scene-number` node-decoration attribute — never an editable node
         * and never stored on the scene.
         */
        const markerStyle = getComputedStyle(firstScene, '::before');
        const colorProbe = document.createElement('span');

        colorProbe.style.color = 'var(--color-text-muted)';
        document.body.appendChild(colorProbe);

        expect(sceneBlocks.map(block => block.dataset.sceneNumber)).toEqual(['1', '2']);
        expect(markerStyle.content).toContain('1');
        expect(markerStyle.fontWeight).toBe('700');
        expect(markerStyle.color).toBe(getComputedStyle(colorProbe).color);
        expect(document.querySelector<HTMLElement>('[data-id="stage-direction-1"]')?.dataset.sceneNumber).toBeUndefined();
        expect(savedScenes.every(scene => scene.attrs?.sceneNumber === undefined)).toBe(true);
    });

    it('keeps three gutter slots with the block type control next to the text', async () => {
        renderEditor();

        await poll(
            () => (window as LifecycleTestWindow).__lifecycleTestEditor,
            'editor instance',
        );

        const typeTrigger = await poll(
            () => document.querySelector<HTMLElement>('[data-block-actions-trigger="true"]'),
            'block type trigger',
        );
        const sceneBlock = document.querySelector<HTMLElement>('p[blocktype="scene"]');
        const controls = typeTrigger.parentElement;

        if (!sceneBlock || !controls) {
            throw new Error('Expected the scene block and its gutter controls.');
        }

        const gridColumns = getComputedStyle(controls).gridTemplateColumns
            .split(' ')
            .filter(Boolean);
        const textGap = sceneBlock.getBoundingClientRect().left
            - typeTrigger.getBoundingClientRect().right;

        expect(gridColumns).toHaveLength(3);
        expect(textGap).toBeGreaterThanOrEqual(0);
        expect(textGap).toBeLessThanOrEqual(8);
    });

    it('places the initial cursor at the first scene of a multi-act script', async () => {
        renderEditor();

        const editor = await poll(
            () => (window as LifecycleTestWindow).__lifecycleTestEditor,
            'editor instance',
        );

        const activeBlock = await poll(() => {
            const block = getActiveScriptBlockFromState(editor.state);

            return block?.blockType === 'scene' ? block : null;
        }, 'initial scene selection');

        expect(activeBlock.blockType).toBe('scene');
        expect(activeBlock.id).toBe('scene-1');
        expect(document.activeElement).toBe(editor.view.dom);
    });

    it('does not make Undo available right after a script loads', async () => {
        renderEditor();

        const editor = await poll(
            () => (window as LifecycleTestWindow).__lifecycleTestEditor,
            'editor instance',
        );

        await poll(() => {
            const block = getActiveScriptBlockFromState(editor.state);

            return block?.blockType === 'scene' ? block : null;
        }, 'initial scene selection');

        expect(editor.can().undo()).toBe(false);
    });

    it('renders a quiet prompt in the active empty scene', async () => {
        renderEditor();

        const placeholderBlock = await poll(
            () => document.querySelector<HTMLElement>('[data-placeholder]'),
            'visible editor placeholder',
        );
        const placeholderStyle = getComputedStyle(placeholderBlock, '::before');
        const colorProbe = document.createElement('span');

        colorProbe.style.color = 'var(--color-text-placeholder)';
        document.body.appendChild(colorProbe);

        expect(placeholderBlock.dataset.placeholder).toBe('Start writing…');
        expect(placeholderStyle.content).not.toBe('none');
        expect(placeholderStyle.color).toBe(getComputedStyle(colorProbe).color);
    });

    it('does not render the prompt in an empty block when another block contains text', async () => {
        const scriptDocument = createDefaultScriptDocument('scene-1');

        scriptDocument.content.push({
            type: 'stageDirection',
            attrs: {id: 'stage-direction-1'},
            content: [{type: 'text', text: 'The work light fades.'}],
        });
        renderEditor(scriptDocument);

        await poll(
            () => (window as LifecycleTestWindow).__lifecycleTestEditor,
            'editor instance',
        );

        expect(document.querySelector('[data-placeholder]')).toBeNull();
    });

    it('does not render the prompt in an empty block when another block contains a non-text element', async () => {
        const scriptDocument = createDefaultScriptDocument('scene-1');

        scriptDocument.content.push({
            type: 'stageDirection',
            attrs: {id: 'music-block'},
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'music-1',
                        mode: 'open',
                        title: 'One Small Light',
                        kind: 'song',
                    },
                },
            ],
        });
        renderEditor(scriptDocument);

        await poll(
            () => (window as LifecycleTestWindow).__lifecycleTestEditor,
            'editor instance',
        );

        expect(document.querySelector('[data-placeholder]')).toBeNull();
    });

    it('dismisses the prompt after the first editor interaction', async () => {
        renderEditor();

        const placeholderBlock = await poll(
            () => document.querySelector<HTMLElement>('[data-placeholder]'),
            'visible editor placeholder',
        );

        await userEvent.click(placeholderBlock);

        expect(document.querySelector('[data-placeholder]')).toBeNull();
    });

    it('dismisses the prompt after the first keyboard interaction', async () => {
        renderEditor();

        await poll(
            () => document.querySelector<HTMLElement>('[data-placeholder]'),
            'visible editor placeholder',
        );

        await userEvent.keyboard('{ArrowRight}');

        expect(document.querySelector('[data-placeholder]')).toBeNull();
    });
});
