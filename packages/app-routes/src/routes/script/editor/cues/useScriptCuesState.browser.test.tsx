import {
    useScriptCues,
    type useScriptRepository,
} from '@stagistic/app-core';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useScriptCuesState} from './useScriptCuesState';

type Repository = ReturnType<typeof useScriptRepository>;
type CueRow = Awaited<ReturnType<Repository['listScriptCues']>>[number];

const roots: Root[] = [];

const cue = (
    scriptId: string,
    title: string,
    startBlockId: string | null = null,
): CueRow => ({
    id: 'cue-1',
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

const createSource = (initialRows: CueRow[]) => {
    let rows = initialRows;
    const listeners = new Set<(nextRows: readonly CueRow[]) => void>();

    return {
        read: () => Promise.resolve(rows),
        refresh: () => Promise.resolve(),
        subscribe: (listener: (nextRows: readonly CueRow[]) => void) => {
            listeners.add(listener);
            listener(rows);

            return Promise.resolve(() => listeners.delete(listener));
        },
        emit: (nextRows: CueRow[]) => {
            rows = nextRows;
            listeners.forEach(listener => listener(rows));
        },
    };
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for cue state');
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
    const catalog = useScriptCues(scriptId, repository);
    const state = useScriptCuesState(scriptId, catalog);

    return (
        <div>
            <output data-testid="cue">
                {state.cues.map(row => `${row.title}:${row.assignmentLabel ?? 'unassigned'}`).join(',')}
            </output>
            <output data-testid="request">{state.updateCueRequest?.title ?? ''}</output>
            <button type="button" onClick={() => state.markCueAssigned('cue-1')}>Assign</button>
            <button
                type="button"
                onClick={() => {
                    void state.updateCue('cue-1', {title: 'Changed', kind: 'song'}).catch(() => undefined);
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

describe('useScriptCuesState', () => {
    it('does not carry assignment intent across route teardown', async () => {
        const first = createSource([cue('script-1', 'First')]);
        const second = createSource([cue('script-2', 'Second')]);
        const repository = {
            getScriptCuesSource: (scriptId: string) => {
                return scriptId === 'script-1' ? first : second;
            },
        } as unknown as Repository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(<Harness scriptId="script-1" repository={repository} />);
        await waitFor(() => host.querySelector('[data-testid="cue"]')?.textContent === 'First:unassigned');

        host.querySelector<HTMLButtonElement>('button')?.click();
        await waitFor(() => host.querySelector('[data-testid="cue"]')?.textContent === 'First:Assigned');
        host.querySelector<HTMLButtonElement>('button')?.click();

        expect(host.querySelector('[data-testid="cue"]')?.textContent).toBe('First:Assigned');

        root.render(<Harness scriptId="script-2" repository={repository} />);
        await waitFor(() => host.querySelector('[data-testid="cue"]')?.textContent === 'Second:unassigned');

        expect(host.querySelector('[data-testid="cue"]')?.textContent).toBe('Second:unassigned');
    });

    it('compensates the editor request when catalog persistence fails', async () => {
        const source = createSource([cue('script-1', 'Original')]);
        const repository = {
            getScriptCuesSource: () => source,
            updateScriptCue: () => Promise.reject(new Error('write failed')),
        } as unknown as Repository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(<Harness scriptId="script-1" repository={repository} />);
        await waitFor(() => host.querySelector('[data-testid="cue"]')?.textContent === 'Original:unassigned');

        host.querySelectorAll<HTMLButtonElement>('button')[1]?.click();
        await waitFor(() => host.querySelector('[data-testid="request"]')?.textContent === 'Original');

        expect(host.querySelector('[data-testid="cue"]')?.textContent).toBe('Original:unassigned');
    });
});
