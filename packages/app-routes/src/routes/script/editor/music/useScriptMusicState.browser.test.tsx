import {
    useScriptMusic,
    type useScriptRepository,
} from '@stagistic/app-core';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useScriptMusicState} from './useScriptMusicState';

type Repository = ReturnType<typeof useScriptRepository>;
type MusicRow = Awaited<ReturnType<Repository['listScriptMusic']>>[number];

const roots: Root[] = [];

const music = (
    scriptId: string,
    title: string,
    startBlockId: string | null = null,
): MusicRow => ({
    id: 'music-1',
    scriptId,
    sceneNumber: 0,
    indexInScene: 0,
    mode: 'open',
    title,
    kind: 'song',
    startBlockId,
    endBlockId: null,
    createdAt: 1,
    updatedAt: 1,
});

const createSource = (initialRows: MusicRow[]) => {
    let rows = initialRows;
    const listeners = new Set<(nextRows: readonly MusicRow[]) => void>();

    return {
        read: () => Promise.resolve(rows),
        refresh: () => Promise.resolve(),
        subscribe: (listener: (nextRows: readonly MusicRow[]) => void) => {
            listeners.add(listener);
            listener(rows);

            return Promise.resolve(() => listeners.delete(listener));
        },
        emit: (nextRows: MusicRow[]) => {
            rows = nextRows;
            listeners.forEach(listener => listener(rows));
        },
    };
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for music state');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = ({
    scriptId,
    repository,
}: {
    scriptId: string,
    repository: Repository,
}) => {
    const catalog = useScriptMusic(scriptId, repository);
    const state = useScriptMusicState(scriptId, catalog);

    return (
        <div>
            <output data-testid="music">
                {state.music.map(row => `${row.title}:${row.assignmentLabel ?? 'unassigned'}`).join(',')}
            </output>
            <output data-testid="request">{state.updateMusicRequest?.title ?? ''}</output>
            <button type="button" onClick={() => state.markMusicAssigned('music-1')}>Assign</button>
            <button
                type="button"
                onClick={() => {
                    void state.updateMusic('music-1', {title: 'Changed', kind: 'song'}).catch(() => undefined);
                }}
            >
                Update
            </button>
        </div>
    );
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useScriptMusicState', () => {
    it('does not carry assignment intent across route teardown', async () => {
        const first = createSource([music('script-1', 'First')]);
        const second = createSource([music('script-2', 'Second')]);
        const repository = {
            getScriptMusicSource: (scriptId: string) => {
                return scriptId === 'script-1' ? first : second;
            },
        } as unknown as Repository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(<Harness scriptId="script-1" repository={repository} />);
        await waitFor(() => host.querySelector('[data-testid="music"]')?.textContent === 'First:unassigned');

        host.querySelector<HTMLButtonElement>('button')?.click();
        await waitFor(() => host.querySelector('[data-testid="music"]')?.textContent === 'First:Assigned');
        host.querySelector<HTMLButtonElement>('button')?.click();

        expect(host.querySelector('[data-testid="music"]')?.textContent).toBe('First:Assigned');

        root.render(<Harness scriptId="script-2" repository={repository} />);
        await waitFor(() => host.querySelector('[data-testid="music"]')?.textContent === 'Second:unassigned');

        expect(host.querySelector('[data-testid="music"]')?.textContent).toBe('Second:unassigned');
    });

    it('compensates the editor request when catalog persistence fails', async () => {
        const source = createSource([music('script-1', 'Original')]);
        const repository = {
            getScriptMusicSource: () => source,
            updateScriptMusic: () => Promise.reject(new Error('write failed')),
        } as unknown as Repository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(<Harness scriptId="script-1" repository={repository} />);
        await waitFor(() => host.querySelector('[data-testid="music"]')?.textContent === 'Original:unassigned');

        host.querySelectorAll<HTMLButtonElement>('button')[1]?.click();
        await waitFor(() => host.querySelector('[data-testid="request"]')?.textContent === 'Original');

        expect(host.querySelector('[data-testid="music"]')?.textContent).toBe('Original:unassigned');
    });
});
