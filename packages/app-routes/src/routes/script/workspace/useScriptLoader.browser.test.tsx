import {SCRIPT_DOCUMENT_SCHEMA_VERSION, type ScriptDocument} from '@stagistic/script';
import {requireValue} from '@stagistic/shared';
import {
    type OpenedScript,
    seedBodyDoc,
    type SyncEngineClient,
} from '@stagistic/sync-engine';
import {useLayoutEffect} from 'react';
import {flushSync} from 'react-dom';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import * as Y from 'yjs';

import {useScriptLoader} from './useScriptLoader';

type Loader = ReturnType<typeof useScriptLoader>;
type Repository = Parameters<typeof useScriptLoader>[1];

const roots: Root[] = [];
const docs: Y.Doc[] = [];

const documentWithScene = (id: string): ScriptDocument => ({
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id},
            content: [{type: 'text', text: id}],
        },
    ],
});

const createOpened = (sceneId: string) => {
    const body = new Y.Doc();
    const meta = new Y.Doc();

    docs.push(body, meta);
    seedBodyDoc(body, documentWithScene(sceneId));

    return {
        scriptId: 'script-1',
        body,
        meta,
        schemaVersion: SCRIPT_DOCUMENT_SCHEMA_VERSION,
        flush: () => Promise.resolve(),
        release: vi.fn(),
    };
};

const Harness = ({
    scriptId,
    repository,
    sync = null,
    capture,
}: {
    scriptId: string,
    repository: Repository,
    sync?: Parameters<typeof useScriptLoader>[2],
    capture: (state: Loader) => void,
}) => {
    const state = useScriptLoader(scriptId, repository, sync);

    useLayoutEffect(() => capture(state), [capture, state]);

    return null;
};

const mount = () => {
    const root = createRoot(document.body.appendChild(document.createElement('div')));

    roots.push(root);

    return root;
};

afterEach(() => {
    roots.splice(0).forEach(root => root.unmount());
    docs.splice(0).forEach(doc => doc.destroy());
    document.body.innerHTML = '';
});

describe('useScriptLoader lifecycle', () => {
    it('drops the old replica and reopens after an engine reset for the current script', async () => {
        const first = createOpened('first');
        const replacement = createOpened('replacement');
        const listeners = new Set<(scriptIds: string[]) => void>();
        let completeOpen: ((opened: OpenedScript) => void) | undefined;
        const openScript = vi.fn<SyncEngineClient['openScript']>()
            .mockResolvedValueOnce(first)
            .mockImplementationOnce(() => new Promise(resolve => {
                completeOpen = resolve;
            }));
        const sync = {
            openScript,
            onScriptsReset: (listener: (scriptIds: string[]) => void) => {
                listeners.add(listener);

                return () => {
                    listeners.delete(listener);
                };
            },
        } satisfies NonNullable<Parameters<typeof useScriptLoader>[2]>;
        const repository: Repository = {
            loadLatest: () => Promise.resolve(null),
            saveLatest: () => Promise.resolve(),
        };
        let latest: Loader | undefined;
        const capture = (state: Loader) => {
            latest = state;
        };
        const root = mount();

        flushSync(() => root.render(<Harness scriptId="script-1" repository={repository} sync={sync} capture={capture} />));
        await expect.poll(() => latest?.replica).toBe(first);
        flushSync(() => listeners.forEach(listener => listener(['another-script'])));
        expect(openScript).toHaveBeenCalledTimes(1);

        flushSync(() => listeners.forEach(listener => listener(['script-1'])));
        expect(latest?.replica).toBeNull();
        expect(latest?.initialValue).toBeUndefined();
        expect(first.release).toHaveBeenCalledTimes(1);
        await expect.poll(() => openScript.mock.calls.length).toBe(2);
        requireValue(completeOpen)(replacement);
        await expect.poll(() => latest?.replica).toBe(replacement);
        expect(latest?.initialValue).toEqual(documentWithScene('replacement'));
    });

    it('ignores an old repository load that finishes after switching scripts', async () => {
        let completeFirst: ((value: ScriptDocument | null) => void) | undefined;
        const repository: Repository = {
            loadLatest: scriptId => (scriptId === 'first'
                ? new Promise(resolve => {
                    completeFirst = resolve;
                })
                : Promise.resolve(documentWithScene('second'))),
            saveLatest: () => Promise.resolve(),
        };
        let latest: Loader | undefined;
        const capture = (state: Loader) => {
            latest = state;
        };
        const root = mount();

        flushSync(() => root.render(<Harness scriptId="first" repository={repository} capture={capture} />));
        await expect.poll(() => completeFirst !== undefined).toBe(true);
        flushSync(() => root.render(<Harness scriptId="second" repository={repository} capture={capture} />));
        expect(latest?.initialValue).toBeUndefined();
        await expect.poll(() => latest?.initialValue?.content[0]?.attrs?.id).toBe('second');

        requireValue(completeFirst)(documentWithScene('first'));
        await new Promise(resolve => window.setTimeout(resolve, 0));
        expect(latest?.initialValue?.content[0]?.attrs?.id).toBe('second');
    });
});
