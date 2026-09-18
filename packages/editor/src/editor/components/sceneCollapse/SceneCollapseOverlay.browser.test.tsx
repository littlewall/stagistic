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
import {userEvent} from 'vite-plus/test/browser';

import {useEditorInstance} from '../../context';
import ScriptEditor from '../../Editor';

type OverlayTestWindow = Window & {__sceneCollapseOverlayEditor?: Editor | null};

const block = (type: ScriptNode['type'], id: string, text: string): ScriptNode => ({
    type,
    attrs: {id},
    content: text ? [{type: 'text', text}] : [],
});

const initialValue: ScriptDocument = {
    type: 'doc',
    content: [
        block('scene', 's1', 'FIRST'),
        block('stageDirection', 'b1', 'A room.'),
        block('scene', 's2', 'SECOND'),
        block('stageDirection', 'b2', 'Outside.'),
        block('scene', 's3', 'EMPTY'),
    ],
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as OverlayTestWindow).__sceneCollapseOverlayEditor = editor;

        return () => {
            delete (window as OverlayTestWindow).__sceneCollapseOverlayEditor;
        };
    }, [editor]);

    return null;
};

const mountedRoots: Root[] = [];

const renderEditor = () => {
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

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const getEditor = () => poll(
    () => (window as OverlayTestWindow).__sceneCollapseOverlayEditor ?? null,
    'editor instance',
);

const getButton = (sceneBlockId: string) => document.querySelector<HTMLButtonElement>(
    `[data-scene-collapse-trigger='true'][data-scene-id='${sceneBlockId}']`,
);

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('SceneCollapseOverlay', () => {
    it('renders controls only for scenes with body content', async () => {
        renderEditor();

        await poll(() => getButton('s1'), 'first scene collapse button');

        expect(getButton('s1')?.getAttribute('aria-label')).toBe('Scene content');
        expect(getButton('s1')?.getAttribute('aria-expanded')).toBe('true');
        expect(getButton('s2')).not.toBeNull();
        expect(getButton('s3')).toBeNull();
    });

    it('keeps a collapsed control visible and renders its helper copy', async () => {
        renderEditor();

        const editor = await getEditor();
        const button = await poll(() => getButton('s1'), 'first scene collapse button');

        await userEvent.click(button);

        expect(editor.commands.toggleSceneCollapsed).toBeTypeOf('function');
        await poll(
            () => button.getAttribute('aria-expanded') === 'false' ? true : null,
            'the control to report a collapsed scene',
        );
        expect(button.closest('[data-scene-collapse-item]')?.getAttribute('data-visible')).toBe('true');
        expect(document.querySelector('[data-scene-collapse-summary=\'s1\']')?.textContent)
            .toBe('Scene content is collapsed');
    });

    it('reveals an expanded control only while the control itself is hovered', async () => {
        renderEditor();

        const button = await poll(() => getButton('s2'), 'second scene collapse button');
        const item = button.closest<HTMLElement>('[data-scene-collapse-item]');
        const heading = document.querySelector<HTMLElement>('[data-id=\'s2\']');

        if (!item || !heading) {
            throw new Error('Missing second scene control or heading');
        }

        await userEvent.hover(heading);

        expect(item?.getAttribute('data-visible')).toBe('false');
        expect(getComputedStyle(item).opacity).toBe('0');

        await userEvent.hover(button);

        await poll(
            () => getComputedStyle(item).opacity === '1' ? true : null,
            'the hovered control to fade in',
        );
    });
});
