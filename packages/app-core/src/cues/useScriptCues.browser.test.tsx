import {
    createInMemoryReactiveQuerySource,
    type ScriptCue,
    type ScriptRepository,
} from '@stagistic/db';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useScriptCues} from './useScriptCues';

const roots: Root[] = [];

const cue = (
    scriptId: string,
    id: string,
    title: string,
    startBlockId: string | null = null,
): ScriptCue => ({
    id,
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

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for cues hook');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = ({
    consumer,
    scriptId,
    repository,
}: {
    consumer: string,
    scriptId: string,
    repository: ScriptRepository,
}) => {
    const {cues, isLoading} = useScriptCues(scriptId, repository);

    return (
        <output data-testid={consumer} data-ready={String(!isLoading)}>
            {cues.map(row => `${row.title}:${row.startBlockId ? 'assigned' : 'unassigned'}`).join(',')}
        </output>
    );
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useScriptCues', () => {
    it('projects assigned and unassigned source rows to every consumer', async () => {
        const source = createInMemoryReactiveQuerySource<ScriptCue>([cue('script-1', 'cue-1', 'Opening'), cue('script-1', 'cue-2', 'Finale', 'block-1')]);
        const repository = {
            getScriptCuesSource: () => source,
        } as unknown as ScriptRepository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(
            <>
                <Harness
                    consumer="first"
                    scriptId="script-1"
                    repository={repository}
                />
                <Harness
                    consumer="second"
                    scriptId="script-1"
                    repository={repository}
                />
            </>,
        );
        await waitFor(() => host.textContent?.includes('Finale:assigned') ?? false);

        source.emit([cue('script-1', 'cue-1', 'Opening', 'block-2')]);
        await waitFor(() => host.textContent === 'Opening:assignedOpening:assigned');

        expect(host.querySelector('[data-testid="first"]')?.textContent).toBe('Opening:assigned');
        expect(host.querySelector('[data-testid="second"]')?.textContent).toBe('Opening:assigned');
    });

    it('ignores the old source after switching scripts', async () => {
        const first = createInMemoryReactiveQuerySource([cue('script-1', 'cue-1', 'First')]);
        const second = createInMemoryReactiveQuerySource([cue('script-2', 'cue-2', 'Second')]);
        const repository = {
            getScriptCuesSource: (scriptId: string) => {
                return scriptId === 'script-1' ? first : second;
            },
        } as unknown as ScriptRepository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(
            <Harness
                consumer="cues"
                scriptId="script-1"
                repository={repository}
            />,
        );
        await waitFor(() => host.textContent === 'First:unassigned');

        root.render(
            <Harness
                consumer="cues"
                scriptId="script-2"
                repository={repository}
            />,
        );
        await waitFor(() => host.textContent === 'Second:unassigned');

        first.emit([cue('script-1', 'late', 'Late')]);
        await new Promise(resolve => window.setTimeout(resolve, 30));

        expect(host.textContent).toBe('Second:unassigned');
    });
});
