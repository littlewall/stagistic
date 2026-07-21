import '@stagistic/ui/styles/base.css';

import {createDefaultScriptDocument} from '@stagistic/script';
import type {Editor} from '@tiptap/react';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

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

const renderEditor = () => {
    const host = document.createElement('div');

    host.style.width = '1024px';
    host.style.height = '720px';
    document.body.appendChild(host);

    const root = createRoot(host);

    root.render(
        <ScriptEditor
            document={{initialValue: createDefaultScriptDocument('scene-1')}}
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
    });
});
