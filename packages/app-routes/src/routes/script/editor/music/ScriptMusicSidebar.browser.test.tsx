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

import {ScriptMusicSidebar} from './ScriptMusicSidebar';

vi.mock('../sidebar/AttributeManagerSidebarButton', () => ({
    AttributeManagerSidebarButton: () => null,
}));

type EditorInstance = NonNullable<ReturnType<typeof useEditorInstance>>;
type MusicSidebarTestWindow = Window & {__musicSidebarEditor?: EditorInstance | null};

const documentWithMusic: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene-1'},
            content: [],
        }, {
            type: 'stageDirection',
            attrs: {id: 'music-block'},
            content: [
                {
                    type: 'musicStart',
                    attrs: {
                        musicId: 'music-1',
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
        (window as MusicSidebarTestWindow).__musicSidebarEditor = editor;

        return () => {
            delete (window as MusicSidebarTestWindow).__musicSidebarEditor;
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

const mountSidebar = ({
    initialValue = documentWithMusic,
    isLoading = false,
    onUnassignMusic = () => {},
}: {
    initialValue?: ScriptDocument,
    isLoading?: boolean,
    onUnassignMusic?: (musicId: string) => void | Promise<void>,
} = {}) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    root.render(
        <ScriptEditor
            document={{initialValue}}
            layout={{
                leftSidebarToggle: {
                    isOpen: true,
                    onToggle: () => {},
                },
            }}
        >
            <ScriptEditor.LeftSidebar>
                <EditorProbe />
                <ScriptMusicSidebar
                    music={[
                        {
                            id: 'music-1',
                            title: 'Overture',
                            kind: 'instrumental',
                            assignmentLabel: '1)',
                        }, {
                            id: 'music-unassigned',
                            title: 'Finale',
                            kind: 'song',
                            assignmentLabel: null,
                        },
                    ]}
                    isLoading={isLoading}
                    onAddMusic={() => {}}
                    onDeleteMusic={() => {}}
                    onUnassignMusic={onUnassignMusic}
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
    delete (window as MusicSidebarTestWindow).__musicSidebarEditor;
    vi.restoreAllMocks();
});

describe('ScriptMusicSidebar', () => {
    it('shows loading without exposing stale content or a false empty state', async () => {
        mountSidebar({isLoading: true});

        await poll(() => document.body.textContent?.includes('Loading music...') ? true : null, 'loading state');

        expect(document.querySelector('[data-music-navigation="true"]')).toBeNull();
        expect(document.body.textContent).not.toContain('No assigned music yet.');
    });

    it('shows music metadata edits from the live editor transaction immediately', async () => {
        mountSidebar();

        const editor = await poll(
            () => (window as MusicSidebarTestWindow).__musicSidebarEditor,
            'editor',
        );

        editor.commands.updateMusicMetadata('music-1', 'Live overture', 'instrumental');

        await poll(
            () => document.body.textContent?.includes('Live overture') ? true : null,
            'live music title',
        );

        expect(document.body.textContent).not.toContain('Overture');
    });

    it('highlights a music clicked in the editor and clears it on the next outside click', async () => {
        mountSidebar();

        const pill = await poll(
            () => document.querySelector<HTMLElement>('[data-music-pill="start"]'),
            'music pill',
        );
        const navigationButton = await poll(
            () => document.querySelector<HTMLButtonElement>('[data-music-navigation="true"]'),
            'music navigation button',
        );

        pill.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        await poll(
            () => navigationButton.getAttribute('aria-current') === 'true' ? true : null,
            'active music row',
        );

        document.body.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        await poll(
            () => navigationButton.hasAttribute('aria-current') ? null : true,
            'cleared music row',
        );
    });

    it('focuses and scrolls to an assigned music block when its label is clicked', async () => {
        const scrollIntoView = vi.spyOn(Element.prototype, 'scrollIntoView');

        mountSidebar();

        const editor = await poll(
            () => (window as MusicSidebarTestWindow).__musicSidebarEditor,
            'editor',
        );
        const navigationButton = await poll(
            () => document.querySelector<HTMLButtonElement>('[data-music-navigation="true"]'),
            'music navigation button',
        );
        let expectedPosition: number | null = null;

        editor.state.doc.descendants((node, position) => {
            if (node.attrs.id === 'music-block') {
                expectedPosition = position + 1;

                return false;
            }

            return true;
        });

        navigationButton.click();
        await poll(
            () => editor.state.selection.from === expectedPosition ? true : null,
            'music block selection',
        );

        expect(scrollIntoView).toHaveBeenCalledWith({block: 'start'});
        expect(document.querySelector('[data-music-id="music-unassigned"][data-music-navigation]')).toBeNull();
    });

    it('completes document unassignment before publishing the catalog intent', async () => {
        const onUnassignMusic = vi.fn();

        mountSidebar({onUnassignMusic});

        const editor = await poll(
            () => (window as MusicSidebarTestWindow).__musicSidebarEditor,
            'editor',
        );
        const action = await poll(
            () => document.querySelector<HTMLButtonElement>('[aria-label="Unassign Overture"]'),
            'unassign action',
        );

        action.click();

        const confirm = await poll(
            () => Array.from(document.querySelectorAll('button')).find(button => {
                return button.textContent?.trim() === 'Unassign music';
            }),
            'unassign confirmation',
        );

        confirm.click();
        await poll(() => onUnassignMusic.mock.calls.length === 1 ? true : null, 'unassign callback');

        expect(JSON.stringify(editor.getJSON())).not.toContain('musicStart');
        expect(onUnassignMusic).toHaveBeenCalledWith('music-1');
    });

    it('does not publish an intent when the editor change fails', async () => {
        const onUnassignMusic = vi.fn();
        const emptyDocument: ScriptDocument = {
            type: 'doc',
            content: [
                {
                    type: 'scene',
                    attrs: {id: 'scene-1'},
                    content: [],
                },
            ],
        };

        mountSidebar({initialValue: emptyDocument, onUnassignMusic});

        const action = await poll(
            () => document.querySelector<HTMLButtonElement>('[aria-label="Unassign Overture"]'),
            'unassign action',
        );

        action.click();

        const confirm = await poll(
            () => Array.from(document.querySelectorAll('button')).find(button => {
                return button.textContent?.trim() === 'Unassign music';
            }),
            'unassign confirmation',
        );

        confirm.click();
        await new Promise(resolve => window.setTimeout(resolve, 30));

        expect(onUnassignMusic).not.toHaveBeenCalled();
    });
});
