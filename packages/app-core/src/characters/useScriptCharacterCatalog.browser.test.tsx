import {
    createInMemoryReactiveQuerySource,
    type ScriptCharacterGenderOption,
    type ScriptCharacterGroupRef,
    type ScriptCharacterRef,
    type ScriptRepository,
} from '@stagistic/db';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useScriptCharacterCatalog} from './useScriptCharacterCatalog';

const roots: Root[] = [];

const character = (id: string, key: string): ScriptCharacterRef => ({
    id,
    kind: 'character',
    key,
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
});

const group = (id: string, key: string): ScriptCharacterGroupRef => ({
    id,
    kind: 'group',
    key,
    colorHex: null,
    memberIds: [],
});

const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise, resolve, reject,
    };
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for character catalog');
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
    const catalog = useScriptCharacterCatalog(scriptId, repository);

    return (
        <output data-testid={consumer}>
            {catalog.characters.map(row => row.key).join(',')}
            |
            {catalog.groups.map(row => row.key).join(',')}
            |
            {catalog.genderOptions.map(option => option.label).join(',')}
        </output>
    );
};

let latestCatalog: ReturnType<typeof useScriptCharacterCatalog> | null = null;

const CatalogProbe = ({repository}: {repository: ScriptRepository}) => {
    latestCatalog = useScriptCharacterCatalog('script-1', repository);

    return <output>{latestCatalog.groups.map(row => row.key).join(',')}</output>;
};

const getLatestCatalog = () => {
    if (!latestCatalog) {
        throw new Error('The catalog has not rendered');
    }

    return latestCatalog;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    latestCatalog = null;
});

describe('useScriptCharacterCatalog', () => {
    it('merges default genders and propagates source updates to every consumer', async () => {
        const characters = createInMemoryReactiveQuerySource([character('character-1', 'ALICE')]);
        const genders = createInMemoryReactiveQuerySource<ScriptCharacterGenderOption>([
            {
                id: 'gender-1',
                key: 'non binary',
                label: 'Non Binary',
            },
        ]);
        const groups = createInMemoryReactiveQuerySource([
            group('group-2', 'ZULU'),
            group('group-1', 'ENSEMBLE'),
        ]);
        const repository = {
            getScriptCharactersSource: () => characters,
            getScriptCharacterGroupsSource: () => groups,
            getScriptCharacterGendersSource: () => genders,
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
        await waitFor(() => {
            return host.textContent?.includes('ALICE|ENSEMBLE,ZULU|Female,Male,Non Binary') ?? false;
        });

        characters.emit([character('character-2', 'BOB')]);
        groups.emit([group('group-3', 'CHORUS')]);
        await waitFor(() => {
            return host.textContent === 'BOB|CHORUS|Female,Male,Non BinaryBOB|CHORUS|Female,Male,Non Binary';
        });

        expect(host.querySelector('[data-testid="first"]')?.textContent)
            .toBe('BOB|CHORUS|Female,Male,Non Binary');
        expect(host.querySelector('[data-testid="second"]')?.textContent)
            .toBe('BOB|CHORUS|Female,Male,Non Binary');
    });

    it('does not apply old source changes after switching scripts', async () => {
        const first = createInMemoryReactiveQuerySource([character('character-1', 'FIRST')]);
        const second = createInMemoryReactiveQuerySource([character('character-2', 'SECOND')]);
        const genders = createInMemoryReactiveQuerySource<ScriptCharacterGenderOption>([]);
        const firstGroups = createInMemoryReactiveQuerySource([group('group-1', 'FIRST GROUP')]);
        const secondGroups = createInMemoryReactiveQuerySource([group('group-2', 'SECOND GROUP')]);
        const repository = {
            getScriptCharactersSource: (scriptId: string) => {
                return scriptId === 'script-1' ? first : second;
            },
            getScriptCharacterGroupsSource: (scriptId: string) => {
                return scriptId === 'script-1' ? firstGroups : secondGroups;
            },
            getScriptCharacterGendersSource: () => genders,
        } as unknown as ScriptRepository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(
            <Harness
                consumer="characters"
                scriptId="script-1"
                repository={repository}
            />,
        );
        await waitFor(() => host.textContent?.startsWith('FIRST|FIRST GROUP|') ?? false);

        root.render(
            <Harness
                consumer="characters"
                scriptId="script-2"
                repository={repository}
            />,
        );
        await waitFor(() => host.textContent?.startsWith('SECOND|SECOND GROUP|') ?? false);

        first.emit([character('late', 'LATE')]);
        await new Promise(resolve => window.setTimeout(resolve, 30));

        expect(host.textContent?.startsWith('SECOND|SECOND GROUP|')).toBe(true);
    });

    it('exposes optimistic group actions, cross-kind validation, rollback, and errors', async () => {
        const characters = createInMemoryReactiveQuerySource([character('character-1', 'ALICE')]);
        const groups = createInMemoryReactiveQuerySource([
            {...group('group-1', 'ENSEMBLE'), memberIds: ['character-1']},
        ]);
        const genders = createInMemoryReactiveQuerySource<ScriptCharacterGenderOption>([]);
        const createGate = deferred();
        const membershipGate = deferred();
        const repository = {
            allocateScriptCharacterGroupId: () => 'new-group-1',
            getScriptCharactersSource: () => characters,
            getScriptCharacterGroupsSource: () => groups,
            getScriptCharacterGendersSource: () => genders,
            createScriptCharacterGroupWithId: async (
                _scriptId: string,
                input: {id: string, key: string, colorHex?: string | null},
            ) => {
                await createGate.promise;

                const created = group(input.id, input.key);

                groups.emit([...await groups.read(), created]);

                return created;
            },
            deleteScriptCharacterGroup: async () => {},
            renameScriptCharacterGroup: async () => null,
            setScriptCharacterGroupColor: async () => null,
            replaceScriptCharacterGroupMembers: async () => {
                await membershipGate.promise;

                return null;
            },
        } as unknown as ScriptRepository;
        const host = document.createElement('div');
        const root = createRoot(host);

        document.body.appendChild(host);
        roots.push(root);
        root.render(<CatalogProbe repository={repository} />);
        await waitFor(() => latestCatalog?.groups.length === 1);

        await expect(getLatestCatalog().createGroup(' alice ')).resolves.toBeNull();
        expect(getLatestCatalog().groups.map(row => row.key)).toEqual(['ENSEMBLE']);

        const creation = getLatestCatalog().createGroup(' chorus ');

        await waitFor(() => getLatestCatalog().creatingGroupKeys.includes('CHORUS'));
        expect(getLatestCatalog().groups.map(row => row.key)).toEqual(['CHORUS', 'ENSEMBLE']);
        expect(getLatestCatalog().deletingGroupIds).toEqual([]);
        expect(getLatestCatalog().renamingGroupIds).toEqual([]);
        expect(getLatestCatalog().colorUpdatingGroupIds).toEqual([]);
        expect(getLatestCatalog().membershipUpdatingGroupIds).toEqual([]);

        createGate.resolve();
        await creation;

        const membership = getLatestCatalog().replaceGroupMembers('group-1', []);

        await waitFor(() => getLatestCatalog().membershipUpdatingGroupIds.includes('group-1'));
        expect(getLatestCatalog().groups.find(row => row.id === 'group-1')?.memberIds).toEqual([]);

        membershipGate.reject(new Error('membership failed'));
        await expect(membership).rejects.toThrow('membership failed');
        await waitFor(() => getLatestCatalog().error?.message === 'membership failed');

        expect(getLatestCatalog().groups.find(row => row.id === 'group-1')?.memberIds)
            .toEqual(['character-1']);
    });
});
