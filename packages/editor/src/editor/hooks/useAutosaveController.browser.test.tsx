import type {ScriptDocument} from '@stagistic/script';
import {useRef} from 'react';
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

import {useAutosaveController} from './useAutosaveController';

const mountedRoots: Root[] = [];

const waitFor = async (predicate: () => boolean, timeoutMs = 1000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise(resolve => {
            window.setTimeout(resolve, 10);
        });
    }

    throw new Error('Timed out waiting for condition');
};

const doc = (text: string): ScriptDocument => ({
    type: 'doc',
    content: [{type: 'text', text}],
} as unknown as ScriptDocument);

type Controller = ReturnType<typeof useAutosaveController>;

interface FixtureProps {
    controllerRef: {current: Controller | null},
    onAutoSave: (value: ScriptDocument) => boolean,
    onValueSynced: (value: ScriptDocument, revision: number) => void,
    resolveLatestValue: () => ScriptDocument | null,
}

const AutosaveFixture = ({controllerRef, onAutoSave, onValueSynced, resolveLatestValue}: FixtureProps) => {
    const controller = useAutosaveController({
        onAutoSave,
        resolveLatestValue,
        autoSaveDelayMs: 20,
        onValueSynced,
    });

    controllerRef.current = controller;

    return null;
};

const renderFixture = (props: Omit<FixtureProps, 'controllerRef'>) => {
    const controllerRef: {current: Controller | null} = {current: null};
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.append(host);
    root.render(<AutosaveFixture controllerRef={controllerRef} {...props} />);
    mountedRoots.push(root);

    return controllerRef;
};

afterEach(() => {
    mountedRoots.forEach(root => root.unmount());
    mountedRoots.length = 0;
    document.body.innerHTML = '';
});

describe('useAutosaveController', () => {
    it('notifies onValueSynced with the value a debounced autosave just persisted', async () => {
        const savedValues: ScriptDocument[] = [];
        const syncedValues: ScriptDocument[] = [];
        let liveValue = doc('v1');

        const controllerRef = renderFixture({
            onAutoSave: value => {
                savedValues.push(value);

                return true;
            },
            onValueSynced: value => {
                syncedValues.push(value);
            },
            resolveLatestValue: () => liveValue,
        });

        await waitFor(() => controllerRef.current !== null);

        // Simulate the user typing more after the debounce was first scheduled.
        liveValue = doc('v2');
        controllerRef.current?.scheduleAutosave({revision: 1});

        await waitFor(() => savedValues.length > 0);
        await waitFor(() => syncedValues.length > 0);

        expect(savedValues[0]).toEqual(doc('v2'));
        expect(syncedValues[0]).toEqual(doc('v2'));
    });
});
