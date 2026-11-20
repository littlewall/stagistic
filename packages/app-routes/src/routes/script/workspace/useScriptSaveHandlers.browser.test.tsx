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

type Reported = {
    storageErrors: (string | null)[],
    toasts: {title: string, variant?: string}[],
    finishedSaves: boolean[],
};

const Harness = ({
    handlersRef,
    stored,
    reported,
    canSave,
}: {
    handlersRef: {current: Handlers | null},
    stored: StoredSnapshot[],
    reported: Reported,
    canSave?: () => boolean,
}) => {
    const handlers = useScriptSaveHandlers({
        context: {
            currentScriptId: 'script-id',
            currentScript: {id: 'script-id', name: 'Script'},
            canSave,
        },
        repository: {
            saveLatest: (scriptId, snapshotValue, snapshotMetadata) => {
                stored.push({
                    scriptId,
                    value: snapshotValue,
                    metadata: snapshotMetadata,
                });

                return Promise.resolve();
            },
            saveSummaryMetadata: (scriptId, snapshotValue, snapshotMetadata, expectedSettings) => {
                stored.push({
                    scriptId,
                    value: snapshotValue,
                    metadata: snapshotMetadata,
                    expectedSettings,
                });

                return Promise.resolve(true);
            },
        },
        notifications: {
            setStorageError: error => reported.storageErrors.push(error),
            addToast: toast => reported.toasts.push(toast),
        },
        state: {
            saveIndicatorControls: {
                startSaveIndicator: () => {},
                finishSaveIndicator: didSave => reported.finishedSaves.push(didSave),
            },
        },
    });

    useLayoutEffect(() => {
        handlersRef.current = handlers;
    }, [handlers, handlersRef]);

    return null;
};

const mount = async (canSave?: () => boolean) => {
    const stored: StoredSnapshot[] = [];
    const reported: Reported = {
        storageErrors: [],
        toasts: [],
        finishedSaves: [],
    };
    const handlersRef: {current: Handlers | null} = {current: null};
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(<Harness stored={stored} handlersRef={handlersRef} reported={reported} canSave={canSave} />);

    const deadline = Date.now() + 1000;

    while (!handlersRef.current && Date.now() < deadline) {
        await new Promise(resolve => window.setTimeout(resolve, 10));
    }

    if (!handlersRef.current) {
        throw new Error('Save handlers did not mount');
    }

    return {
        stored,
        reported,
        handlers: handlersRef.current,
    };
};

afterEach(() => {
    root?.unmount();
    root = null;
    document.body.innerHTML = '';
});

describe('workspace editor save snapshots', () => {
    it('shows a save that ran out of time like any other failed save', async () => {
        const {handlers, reported} = await mount();

        handlers.handleSaveTimedOut();

        expect(reported.storageErrors).toEqual(['Failed to save script data.']);
        expect(reported.toasts).toEqual([expect.objectContaining({title: 'Failed to save', variant: 'error'})]);
        expect(reported.finishedSaves).toEqual([false]);
    });

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

    it('writes nothing once this tab may no longer edit the script', async () => {
        const {stored, handlers} = await mount(() => false);

        expect(await handlers.handleAutoSave(value, metadata)).toBe(false);
        expect(await handlers.handleManualSave(value, metadata)).toBe(false);
        expect(await handlers.handleSummaryMetadataChange(value, metadata)).toBe(false);
        expect(stored).toEqual([]);
    });
});
import {useLayoutEffect} from 'react';
