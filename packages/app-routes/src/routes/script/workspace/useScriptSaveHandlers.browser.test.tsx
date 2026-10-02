import type {
    EditorSettingsOverride,
    ScriptDocument,
    ScriptSummaryMetadata,
} from '@stagistic/script';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useScriptSaveHandlers} from './useScriptSaveHandlers';

type Handlers = ReturnType<typeof useScriptSaveHandlers>;
type StoredSnapshot = {
    scriptId: string,
    value: ScriptDocument,
    metadata?: ScriptSummaryMetadata,
    expectedSettings?: EditorSettingsOverride | null,
};

let root: Root | null = null;

const value: ScriptDocument = {type: 'doc', content: [{type: 'scene', attrs: {id: 'scene'}}]};
const metadata: ScriptSummaryMetadata = {
    pageCount: 5,
    sceneCount: 1,
    actSceneCounts: [],
    unassignedSceneCount: 1,
};

const Harness = ({handlersRef, stored}: {
    handlersRef: {current: Handlers | null},
    stored: StoredSnapshot[],
}) => {
    handlersRef.current = useScriptSaveHandlers({
        context: {currentScriptId: 'script-id', currentScript: {id: 'script-id', name: 'Script'}},
        repository: {
            saveLatest: (scriptId, value, metadata) => {
                stored.push({
                    scriptId,
                    value,
                    metadata,
                });

                return Promise.resolve();
            },
            saveSummaryMetadata: (scriptId, value, metadata, expectedSettings) => {
                stored.push({
                    scriptId,
                    value,
                    metadata,
                    expectedSettings,
                });

                return Promise.resolve(true);
            },
        },
        notifications: {setStorageError: () => {}, addToast: () => {}},
        state: {saveIndicatorControls: {startSaveIndicator: () => {}, finishSaveIndicator: () => {}}},
    });

    return null;
};

const mount = async () => {
    const stored: StoredSnapshot[] = [];
    const handlersRef: {current: Handlers | null} = {current: null};
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness stored={stored} handlersRef={handlersRef} />);

    const deadline = Date.now() + 1000;

    while (!handlersRef.current && Date.now() < deadline) {
        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    if (!handlersRef.current) {
        throw new Error('Save handlers did not mount');
    }

    return {stored, handlers: handlersRef.current};
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('workspace editor save snapshots', () => {
    it('forwards autosave document metadata to the repository', async () => {
        const {stored, handlers} = await mount();

        expect(await handlers.handleAutoSave(value, metadata)).toBe(true);
        expect(stored).toEqual([
            {
                scriptId: 'script-id',
                value,
                metadata,
            },
        ]);
    });

    it('forwards manual save document metadata to the repository', async () => {
        const {stored, handlers} = await mount();

        expect(await handlers.handleManualSave(value, metadata)).toBe(true);
        expect(stored).toEqual([
            {
                scriptId: 'script-id',
                value,
                metadata,
            },
        ]);
    });

    it('forwards a measured metadata refresh with the expected document snapshot', async () => {
        const {stored, handlers} = await mount();
        const expectedSettings: EditorSettingsOverride = {page: {heightPx: 900}};

        expect(await handlers.handleSummaryMetadataChange(value, metadata, expectedSettings)).toBe(true);
        expect(stored).toEqual([
            {
                scriptId: 'script-id',
                value,
                metadata,
                expectedSettings,
            },
        ]);
    });
});
