import '@stagistic/ui/styles/base.css';

import type {ScriptDocument, ScriptNode} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {
    createRoot, type Root,
} from 'react-dom/client';
import {
    afterEach, describe, expect, it,
} from 'vite-plus/test';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type SceneTestWindow = Window & {__sceneTestEditor?: Editor | null};

const scene = (id: string, text: string): ScriptNode => ({
    type: 'scene', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const stageDirection = (id: string, text: string): ScriptNode => ({
    type: 'stageDirection', attrs: {id}, content: text ? [{type: 'text', text}] : [],
});

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as SceneTestWindow).__sceneTestEditor = editor;

        return () => {
            delete (window as SceneTestWindow).__sceneTestEditor;
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

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('scene numbering', () => {
    it('renders the scene number as a ::before pseudo-element, not an editable node', async () => {
        renderEditor({
            type: 'doc',
            content: [scene('s1', 'INT. HOUSE'), stageDirection('b1', 'A room.')],
        });

        const sceneEl = await poll(
            () => document.querySelector<HTMLElement>('p[blocktype="scene"][data-scene-number]'),
            'numbered scene block element',
        );

        /*
         * The number lives in an attribute the CSS renders, never in the DOM
         * content: no widget node sits on the block's first caret position.
         */
        expect(sceneEl.getAttribute('data-scene-number')).toBe('1');
        expect(sceneEl.querySelector('.scene-number')).toBeNull();

        // It is not part of the editable text, so it cannot be selected or exported.
        expect(sceneEl.textContent).toBe('INT. HOUSE');

        const before = window.getComputedStyle(sceneEl, '::before');

        expect(before.content).toContain('1');
    });

    it('numbers multiple scenes sequentially', async () => {
        renderEditor({
            type: 'doc',
            content: [
                scene('s1', 'FIRST'),
                stageDirection('b1', 'x'),
                scene('s2', 'SECOND'),
            ],
        });

        const scenes = await poll(
            () => {
                const found = document.querySelectorAll<HTMLElement>('p[blocktype="scene"][data-scene-number]');

                return found.length === 2 ? found : null;
            },
            'two numbered scene blocks',
        );

        expect(scenes[0].getAttribute('data-scene-number')).toBe('1');
        expect(scenes[1].getAttribute('data-scene-number')).toBe('2');
    });
});
