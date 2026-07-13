import '@stagistic/ui/styles/base.css';

import {
    ScriptEditor,
    useEditorInstance,
} from '@stagistic/editor';
import type {ScriptDocument} from '@stagistic/script';
import {useEffect} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {ScriptCuesSidebar} from './ScriptCuesSidebar';

vi.mock('../sidebar/AttributeManagerSidebarButton', () => ({
    AttributeManagerSidebarButton: () => null,
}));

type EditorInstance = NonNullable<ReturnType<typeof useEditorInstance>>;
type CueSidebarTestWindow = Window & {__cueSidebarEditor?: EditorInstance | null};

const documentWithCue: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene-1'},
            content: [],
        }, {
            type: 'stageDirection',
            attrs: {id: 'cue-block'},
            content: [
                {
                    type: 'cueStart',
                    attrs: {
                        cueId: 'cue-1',
                        mode: 'open',
                        title: 'Overture',
                        kind: 'instrumental',
                    },
                },
            ],
        },
    ],
};

const EditorProbe = () => {
    const editor = useEditorInstance();

    useEffect(() => {
        (window as CueSidebarTestWindow).__cueSidebarEditor = editor;

        return () => {
            delete (window as CueSidebarTestWindow).__cueSidebarEditor;
        };
    }, [editor]);

    return null;
};

const roots: Root[] = [];

const poll = async <T, >(getValue: () => T | null | undefined, label: string): Promise<T> => {
    const deadline = Date.now() + 2000;

    while (Date.now() < deadline) {
        const value = getValue();

        if (value) {
            return value;
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    throw new Error(`Timed out waiting for ${label}`);
};

const mountSidebar = () => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <ScriptEditor document={{initialValue: documentWithCue}}>
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
                <ScriptCuesSidebar
                    cues={[
                        {
                            id: 'cue-1',
                            title: 'Overture',
                            kind: 'instrumental',
                            assignmentLabel: '1)',
                        }, {
                            id: 'cue-unassigned',
                            title: 'Finale',
                            kind: 'song',
                            assignmentLabel: null,
                        },
                    ]}
                    onAddCue={() => {}}
                    onDeleteCue={() => {}}
                    onUnassignCue={() => {}}
                />
            </ScriptEditor.LeftSidebar>
        </ScriptEditor>,
    );
    roots.push(root);
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    delete (window as CueSidebarTestWindow).__cueSidebarEditor;
    vi.restoreAllMocks();
});

describe('ScriptCuesSidebar', () => {
    it('highlights a cue clicked in the editor and clears it on the next outside click', async () => {
        mountSidebar();

        const pill = await poll(
            () => document.querySelector<HTMLElement>('[data-cue-pill="start"]'),
            'cue pill',
        );
        const navigationButton = await poll(
            () => document.querySelector<HTMLButtonElement>('[data-cue-navigation="true"]'),
            'cue navigation button',
        );

        pill.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        await poll(
            () => navigationButton.getAttribute('aria-current') === 'true' ? true : null,
            'active cue row',
        );

        document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        await poll(
            () => navigationButton.hasAttribute('aria-current') ? null : true,
            'cleared cue row',
        );
    });

    it('focuses and scrolls to an assigned cue block when its label is clicked', async () => {
        const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

        mountSidebar();

        const editor = await poll(
            () => (window as CueSidebarTestWindow).__cueSidebarEditor,
            'editor',
        );
        const navigationButton = await poll(
            () => document.querySelector<HTMLButtonElement>('[data-cue-navigation="true"]'),
            'cue navigation button',
        );
        let expectedPosition: number | null = null;

        editor.state.doc.descendants((node, position) => {
            if (node.attrs.id === 'cue-block') {
                expectedPosition = position + 1;

                return false;
            }

            return true;
        });

        navigationButton.click();
        await poll(
            () => editor.state.selection.from === expectedPosition ? true : null,
            'cue block selection',
        );

        expect(scrollIntoView).toHaveBeenCalledWith({block: 'start'});
        expect(document.querySelector('[data-cue-id="cue-unassigned"][data-cue-navigation]')).toBeNull();
    });
});
