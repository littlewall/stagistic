import {createDefaultScriptDocument} from '@stagistic/script';
import {isApplePlatform, requireValue} from '@stagistic/shared';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import ScriptEditor from '../Editor';
import {getMeasuredEditorPageCount} from '../hooks/editorSaveSnapshot';
import {createEditorSnapshotStore} from '../live/store';
import {createScriptDocumentSession} from './createScriptDocumentSession';
import {ScriptDocumentRuntime} from './ScriptDocumentRuntime';

const roots: Root[] = [];
const waitUntil = async (predicate: () => boolean) => {
    const end = Date.now() + 2000;

    while (!predicate() && Date.now() < end) {
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    expect(predicate()).toBe(true);
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('detached script runtime', () => {
    it('creates, edits, saves and undoes a script before the Editor has been opened', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const liveStore = createEditorSnapshotStore();
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore,
        });
        const save = vi.fn(() => Promise.resolve(true));
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        roots.push(root);
        root.render(<ScriptDocumentRuntime session={session} document={{initialValue}} save={{onAutoSave: save}} />);
        await waitUntil(() => session.getSnapshot().isReady);
        expect(host.querySelector('[data-editor]')).toBeNull();

        const id = session.commands.insertScene(null, 'A NEW SCENE');

        expect(id).toBeTruthy();
        expect(session.getDocument().content.at(-1)?.attrs?.id).toBe(id);
        expect(await session.flush()).toBe(true);
        expect(save).toHaveBeenCalledOnce();
        expect(session.undo()).toBe(true);
        expect(session.getDocument().content.some(block => block.attrs?.id === id)).toBe(false);
    });
    it('attaches the Editor to the same document and preserves earlier history', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        roots.push(root);

        const runtime = <ScriptDocumentRuntime session={session} document={{initialValue}} />;

        root.render(runtime);
        await waitUntil(() => session.getSnapshot().isReady);

        const id = session.commands.insertScene(null, 'BOARD SCENE');

        root.render(<>{runtime}<ScriptEditor session={session} document={{initialValue}} /></>);
        await waitUntil(() => host.querySelector('[data-editor]') !== null);
        expect(session.getDocument().content.some(block => block.attrs?.id === id)).toBe(true);
        expect(host.textContent).toContain('BOARD SCENE');
        expect(session.undo()).toBe(true);
        expect(session.getDocument().content.some(block => block.attrs?.id === id)).toBe(false);
    });

    it('applies new scene numbering without losing the document or undo history', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        roots.push(root);

        const render = (format: 'dot' | 'paren') => root.render(
            <>
                <ScriptDocumentRuntime
                    session={session}
                    document={{initialValue}}
                    settings={{scriptSettings: {blocks: {scene: {sceneNumberFormat: format}}}}}
                />
                {session.getSnapshot().isReady ? (
                    <ScriptEditor
                        session={session}
                        document={{initialValue}}
                        settings={{scriptSettings: {blocks: {scene: {sceneNumberFormat: format}}}}}
                    />
                ) : null}
            </>,
        );

        render('dot');
        await waitUntil(() => session.getSnapshot().isReady);

        const id = session.commands.insertScene(null, 'NEW');

        render('dot');
        await waitUntil(() => host.querySelector('[data-id="scene-1"]')?.getAttribute('data-scene-number') === '1.');
        render('paren');
        await waitUntil(() => host.querySelector('[data-id="scene-1"]')?.getAttribute('data-scene-number') === '1)');
        expect(session.getDocument().content.some(block => block.attrs?.id === id)).toBe(true);
        expect(session.undo()).toBe(true);
        expect(session.getDocument().content.some(block => block.attrs?.id === id)).toBe(false);
    });

    it('flushes pending edits on page hide', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });
        const save = vi.fn(() => Promise.resolve(true));
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        roots.push(root);
        root.render(<ScriptDocumentRuntime session={session} document={{initialValue}} save={{onAutoSave: save}} />);
        await waitUntil(() => session.getSnapshot().isReady);
        session.commands.insertScene(null, 'LAST EDIT');
        window.dispatchEvent(new Event('pagehide'));
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(save).toHaveBeenCalledOnce();
    });

    it('stores scene names as typed on the Board, as the Editor does, whatever the scene casing', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        roots.push(root);
        root.render(<ScriptDocumentRuntime session={session} document={{initialValue}} settings={{scriptSettings: {blocks: {scene: {casing: 'uppercase'}}}}} />);
        await waitUntil(() => session.getSnapshot().isReady);

        const id = session.commands.insertScene(null, 'mixed Case');

        // The casing setting is only rendered (CSS), so changing it later restyles every scene alike.
        expect(session.getDocument().content.find(block => block.attrs?.id === id)?.content?.[0].text).toBe('mixed Case');
    });

    it('saves with the Editor shortcut when the session owns autosave', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });
        const onAutoSave = vi.fn(() => Promise.resolve(true));
        const onManualSave = vi.fn(() => Promise.resolve(true));
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        roots.push(root);

        const runtime = <ScriptDocumentRuntime session={session} document={{initialValue}} save={{onAutoSave}} />;

        root.render(runtime);
        await waitUntil(() => session.getSnapshot().isReady);
        session.commands.insertScene(null, 'PENDING');
        root.render(<>{runtime}<ScriptEditor session={session} document={{initialValue}} save={{onManualSave}} /></>);
        await waitUntil(() => host.querySelector('[data-editor]') !== null);
        await userEvent.keyboard(isApplePlatform() ? '{Meta>}s{/Meta}' : '{Control>}s{/Control}');
        await waitUntil(() => onManualSave.mock.calls.length === 1);
        expect(onAutoSave).not.toHaveBeenCalled();
    });

    it('keeps measured page count in autosave while the Editor is open', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });
        const save = vi.fn(() => Promise.resolve(true));
        const host = document.createElement('div');

        host.style.width = '1200px';
        host.style.height = '900px';
        document.body.appendChild(host);

        const root = createRoot(host);

        roots.push(root);

        const runtime = <ScriptDocumentRuntime session={session} document={{initialValue}} save={{onAutoSave: save}} />;

        root.render(runtime);
        await waitUntil(() => session.getSnapshot().isReady);
        root.render(<>{runtime}<ScriptEditor session={session} document={{initialValue}} /></>);
        await waitUntil(() => host.querySelector('[data-editor]') !== null);
        session.commands.renameScene('scene-1', 'SCENE');
        await waitUntil(() => !!session.getEditor() && getMeasuredEditorPageCount(requireValue(session.getEditor())) !== null);

        const pageCount = getMeasuredEditorPageCount(requireValue(session.getEditor()));

        expect(await session.flush()).toBe(true);
        expect(save).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({pageCount}), null);
    });

    it('preserves the last edit when the runtime unmounts during an earlier save', async () => {
        const initialValue = createDefaultScriptDocument('scene-1');
        const session = createScriptDocumentSession({
            initialValue,
            isReadOnly: false,
            liveStore: createEditorSnapshotStore(),
        });
        let finishFirst: ((success: boolean) => void) | undefined;
        const saves: string[] = [];
        const save = vi.fn((value: typeof initialValue) => {
            saves.push(value.content.map(block => block.content?.[0]?.text ?? '').join('|'));

            return saves.length === 1 ? new Promise<boolean>(resolve => {
                finishFirst = resolve;
            }) : Promise.resolve(true);
        });
        const host = document.createElement('div');

        document.body.appendChild(host);

        const root = createRoot(host);

        root.render(<ScriptDocumentRuntime session={session} document={{initialValue}} save={{onAutoSave: save}} />);
        await waitUntil(() => session.getSnapshot().isReady);
        session.commands.insertScene(null, 'FIRST');

        const pending = session.flush();

        await Promise.resolve();
        session.commands.insertScene(null, 'LAST');
        root.unmount();
        await new Promise(resolve => setTimeout(resolve, 30));
        finishFirst?.(true);
        expect(await pending).toBe(true);
        expect(saves.at(-1)).toContain('LAST');
    });
});
