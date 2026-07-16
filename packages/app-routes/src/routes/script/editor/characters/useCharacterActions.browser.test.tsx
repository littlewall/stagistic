import {type useScriptCharacterCatalog} from '@stagistic/app-core';
import {useState} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {useCharacterActions} from './useCharacterActions';

type Catalog = ReturnType<typeof useScriptCharacterCatalog>;

const roots: Root[] = [];

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(resolvePromise => {
        resolve = resolvePromise;
    });

    return {promise, resolve};
};

const waitFor = async (predicate: () => boolean) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for character action');
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const Harness = ({catalog}: {catalog: Catalog}) => {
    const [events, setEvents] = useState<string[]>([]);
    const actions = useCharacterActions({
        catalog,
        documentActions: {
            linkCharacter: () => Promise.resolve(true),
            unlinkCharacter: () => Promise.resolve(true),
            renameCharacter: () => Promise.resolve(true),
        },
        confirmedCharacterSet: new Set(['ALICE']),
        confirmedCharactersById: new Map([
            [
                'character-1', {
                    id: 'character-1',
                    key: 'ALICE',
                    colorHex: null,
                    genderKey: null,
                    notes: null,
                    backstory: null,
                    outline: null,
                },
            ],
        ]),
    });
    const record = (event: string) => setEvents(previous => [...previous, event]);

    return (
        <div>
            <output>{events.join(',')}</output>
            <button
                type="button"
                onClick={() => actions.handleConfirmCharacter('BOB', null, {
                    onLinkRef: () => record('linked'),
                })}
            >
                Confirm
            </button>
            <button
                type="button"
                onClick={() => actions.handleDeleteCharacter('character-1', {
                    onUnlinkRef: () => record('unlinked'),
                })}
            >
                Delete
            </button>
            <button
                type="button"
                onClick={() => actions.handleRenameCharacter(
                    'character-1',
                    'ALICE',
                    'BOB',
                    {
                        onRenameText: (_id, name) => record(`rename:${name}`),
                        onReplaceId: () => record('replaced'),
                    },
                )}
            >
                Rename
            </button>
        </div>
    );
};

const mount = async (catalog: Catalog) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    roots.push(root);
    root.render(<Harness catalog={catalog} />);
    await waitFor(() => host.querySelectorAll('button').length === 3);

    return host;
};

afterEach(() => {
    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
});

describe('useCharacterActions', () => {
    it('does not change editor refs when confirm persistence fails', async () => {
        const catalog = {
            confirmCharacter: () => Promise.reject(new Error('write failed')),
        } as unknown as Catalog;
        const host = await mount(catalog);

        host.querySelectorAll<HTMLButtonElement>('button')[0]?.click();
        await new Promise(resolve => window.setTimeout(resolve, 30));

        expect(host.querySelector('output')?.textContent).toBe('');
    });

    it('publishes delete document intent only after metadata persistence', async () => {
        const gate = deferred();
        const catalog = {
            deleteCharacter: () => gate.promise,
        } as unknown as Catalog;
        const host = await mount(catalog);

        host.querySelectorAll<HTMLButtonElement>('button')[1]?.click();

        expect(host.querySelector('output')?.textContent).toBe('');

        gate.resolve();
        await waitFor(() => host.querySelector('output')?.textContent === 'unlinked');

        expect(host.querySelector('output')?.textContent).toBe('unlinked');
    });

    it('compensates editor text when rename persistence fails', async () => {
        const catalog = {
            renameCharacter: () => Promise.reject(new Error('duplicate')),
        } as unknown as Catalog;
        const host = await mount(catalog);

        host.querySelectorAll<HTMLButtonElement>('button')[2]?.click();
        await waitFor(() => host.querySelector('output')?.textContent === 'rename:BOB,rename:ALICE');

        expect(host.querySelector('output')?.textContent).toBe('rename:BOB,rename:ALICE');
    });
});
