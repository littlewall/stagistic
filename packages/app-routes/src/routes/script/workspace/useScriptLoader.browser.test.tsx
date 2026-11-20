import type {ScriptDocument} from '@stagistic/script';
import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {useScriptLoader} from './useScriptLoader';

type LoaderResult = ReturnType<typeof useScriptLoader>;
type Repository = Parameters<typeof useScriptLoader>[1];

let root: Root | null = null;

const RETRY_DELAYS_MS = [
    10,
    10,
    10,
];

const stored: ScriptDocument = {
    type: 'doc',
    content: [
        {
            type: 'scene',
            attrs: {id: 'scene'},
            content: [
                {
                    type: 'sceneHeading',
                    attrs: {id: 'heading'},
                    content: [{type: 'text', text: 'Stored heading'}],
                },
            ],
        },
    ],
};

const Harness = ({repository, onResult}: {repository: Repository, onResult: (result: LoaderResult) => void}) => {
    onResult(useScriptLoader('script-1', repository, {isReadOnly: true, retryDelaysMs: RETRY_DELAYS_MS}));

    return null;
};

const mount = (repository: Repository) => {
    const latest: {current: LoaderResult | null} = {current: null};
    const host = document.createElement('div');

    document.body.append(host);
    root = createRoot(host);
    root.render(
        <Harness
            repository={repository}
            onResult={result => {
                latest.current = result;
            }}
        />,
    );

    return latest;
};

afterEach(() => {
    root?.unmount();
    root = null;
});

describe('useScriptLoader', () => {
    it('tries a failed load again before falling back to an empty script', async () => {
        const loadLatest = vi.fn<Repository['loadLatest']>()
            .mockRejectedValueOnce(new Error('leader changed'))
            .mockResolvedValue(stored);
        const latest = mount({loadLatest, saveLatest: () => Promise.resolve()});

        await vi.waitFor(() => expect(latest.current?.initialValue).toBeTruthy());

        expect(loadLatest).toHaveBeenCalledTimes(2);
        expect(latest.current?.storageError).toBeNull();
        expect(JSON.stringify(latest.current?.initialValue)).toContain('Stored heading');
    });

    it('reports the failure once every attempt failed', async () => {
        const loadLatest = vi.fn<Repository['loadLatest']>().mockRejectedValue(new Error('down'));
        const latest = mount({loadLatest, saveLatest: () => Promise.resolve()});

        await vi.waitFor(() => expect(latest.current?.storageError).toBe('Failed to load script data.'));

        expect(loadLatest).toHaveBeenCalledTimes(4);
        expect(latest.current?.initialValue).toBeNull();
    });

    it('offers no editable fallback and loads the stored text on Try again', async () => {
        const loadLatest = vi.fn<Repository['loadLatest']>().mockRejectedValue(new Error('down'));
        const saveLatest = vi.fn<Repository['saveLatest']>(() => Promise.resolve());
        const latest = mount({loadLatest, saveLatest});

        await vi.waitFor(() => expect(latest.current?.storageError).toBe('Failed to load script data.'));

        expect(latest.current?.initialValue).toBeNull();
        expect(saveLatest).not.toHaveBeenCalled();

        loadLatest.mockResolvedValue(stored);
        act(() => latest.current?.retryLoad());

        await vi.waitFor(() => expect(latest.current?.initialValue).toBeTruthy());

        expect(latest.current?.storageError).toBeNull();
        expect(JSON.stringify(latest.current?.initialValue)).toContain('Stored heading');
    });

    it('opens a script that does not exist yet as a new empty script', async () => {
        const latest = mount({loadLatest: () => Promise.resolve(null), saveLatest: () => Promise.resolve()});

        await vi.waitFor(() => expect(latest.current?.initialValue).toBeTruthy());

        expect(latest.current?.storageError).toBeNull();
    });
});
