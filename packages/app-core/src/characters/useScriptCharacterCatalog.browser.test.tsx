import {
    createInMemoryReactiveQuerySource,
    type ScriptCharacterGenderOption,
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
    key,
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
});

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
            {catalog.genderOptions.map(option => option.label).join(',')}
        </output>
    );
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
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
        const repository = {
            getScriptCharactersSource: () => characters,
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
        await waitFor(() => host.textContent?.includes('ALICE|Female,Male,Non Binary') ?? false);

        characters.emit([character('character-2', 'BOB')]);
        await waitFor(() => host.textContent === 'BOB|Female,Male,Non BinaryBOB|Female,Male,Non Binary');

        expect(host.querySelector('[data-testid="first"]')?.textContent)
            .toBe('BOB|Female,Male,Non Binary');
        expect(host.querySelector('[data-testid="second"]')?.textContent)
            .toBe('BOB|Female,Male,Non Binary');
    });

    it('does not apply old source changes after switching scripts', async () => {
        const first = createInMemoryReactiveQuerySource([character('character-1', 'FIRST')]);
        const second = createInMemoryReactiveQuerySource([character('character-2', 'SECOND')]);
        const genders = createInMemoryReactiveQuerySource<ScriptCharacterGenderOption>([]);
        const repository = {
            getScriptCharactersSource: (scriptId: string) => {
                return scriptId === 'script-1' ? first : second;
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
        await waitFor(() => host.textContent?.startsWith('FIRST|') ?? false);

        root.render(
            <Harness
                consumer="characters"
                scriptId="script-2"
                repository={repository}
            />,
        );
        await waitFor(() => host.textContent?.startsWith('SECOND|') ?? false);

        first.emit([character('late', 'LATE')]);
        await new Promise(resolve => window.setTimeout(resolve, 30));

        expect(host.textContent?.startsWith('SECOND|')).toBe(true);
    });
});
