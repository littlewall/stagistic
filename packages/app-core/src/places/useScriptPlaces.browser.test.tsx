import {
    createInMemoryReactiveQuerySource,
    type ScriptLocation,
    type ScriptRepository,
    type ScriptSceneLocationAssignment,
} from '@stagistic/db';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useScriptPlaces} from './useScriptPlaces';

const roots: Root[] = [];

const location = (scriptId: string, id: string, name: string): ScriptLocation => ({
    id,
    scriptId,
    name,
    description: null,
    createdAt: 1,
    updatedAt: 1,
});

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for places hook');
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
    const {places, isLoading} = useScriptPlaces(scriptId, repository);

    return (
        <output data-testid={consumer} data-ready={String(!isLoading)}>
            {places.map(placeRow => placeRow.name).join(',')}
        </output>
    );
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useScriptPlaces', () => {
    it('does not apply a late snapshot after switching scripts', async () => {
        const first = createInMemoryReactiveQuerySource<ScriptLocation>([location('script-1', 'place-1', 'First')]);
        const second = createInMemoryReactiveQuerySource<ScriptLocation>([location('script-2', 'place-2', 'Second')]);
        const emptyAssignments = createInMemoryReactiveQuerySource<
            ScriptSceneLocationAssignment
        >([]);
        const adapter = {
            getScriptLocationsSource: (scriptId: string) => {
                return scriptId === 'script-1' ? first : second;
            },
            getScriptSceneLocationsSource: () => emptyAssignments,
        } as unknown as ScriptRepository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(
            <Harness
                consumer="places"
                scriptId="script-1"
                repository={adapter}
            />,
        );
        await waitFor(() => host.textContent === 'First');

        root.render(
            <Harness
                consumer="places"
                scriptId="script-2"
                repository={adapter}
            />,
        );
        await waitFor(() => host.textContent === 'Second');

        first.emit([location('script-1', 'late', 'Late first')]);
        await new Promise(resolve => window.setTimeout(resolve, 30));

        expect(host.textContent).toBe('Second');
    });

    it('propagates one committed source update to every mounted consumer', async () => {
        const locations = createInMemoryReactiveQuerySource<ScriptLocation>([location('script-1', 'place-1', 'First')]);
        const assignments = createInMemoryReactiveQuerySource<
            ScriptSceneLocationAssignment
        >([]);
        const adapter = {
            getScriptLocationsSource: () => locations,
            getScriptSceneLocationsSource: () => assignments,
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
                    repository={adapter}
                />
                <Harness
                    consumer="second"
                    scriptId="script-1"
                    repository={adapter}
                />
            </>,
        );
        await waitFor(() => host.textContent === 'FirstFirst');

        locations.emit([location('script-1', 'place-2', 'External')]);
        await waitFor(() => host.textContent === 'ExternalExternal');

        expect(host.querySelector('[data-testid="first"]')?.textContent).toBe('External');
        expect(host.querySelector('[data-testid="second"]')?.textContent).toBe('External');
    });
});
