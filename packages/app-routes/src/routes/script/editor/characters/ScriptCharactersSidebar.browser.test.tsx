import '@stagistic/ui/styles/base.css';

import {
    type ScriptRepository,
    useScriptCharacterCatalog,
} from '@stagistic/app-core';
import {DEFAULT_EDITOR_SETTINGS} from '@stagistic/script';
import type {ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import {userEvent} from 'vite-plus/test/browser';

import {
    type ScriptCharactersContextValue,
    ScriptCharactersProvider,
} from '../../ScriptCharactersContext';
import {ScriptCharactersSidebar} from './ScriptCharactersSidebar';

vi.mock('@stagistic/editor', async importOriginal => {
    const original = await importOriginal<typeof import('@stagistic/editor')>();

    return {
        ...original,
        useEditorLiveCharacters: () => null,
    };
});

vi.mock('../../ScriptSessionContext', () => ({
    useScriptSession: () => ({resolvedScriptSettings: DEFAULT_EDITOR_SETTINGS}),
}));

vi.mock('../../settings/ScriptSettingsModalProvider', () => ({
    useScriptSettingsModal: () => ({
        openAttributeManagerCharacter: () => {},
        openAttributeManagerGroup: () => {},
    }),
}));

vi.mock('../sidebar/AttributeManagerSidebarButton', () => ({
    AttributeManagerSidebarButton: () => null,
}));

const roots: Root[] = [];
let activeUnhandledHandler: ((event: PromiseRejectionEvent) => void) | null = null;

const waitFor = async (predicate: () => boolean, label: string) => {
    const deadline = Date.now() + 2_000;

    while (!predicate()) {
        if (Date.now() >= deadline) {
            throw new Error(`Timed out waiting for ${label}`);
        }

        await new Promise(resolve => window.setTimeout(resolve, 10));
    }
};

const createReactiveSource = <T, >(initialRows: readonly T[]) => {
    const listeners = new Set<(rows: readonly T[]) => void>();

    return {
        read: () => Promise.resolve(initialRows),
        subscribe: (listener: (rows: readonly T[]) => void) => {
            listeners.add(listener);
            listener(initialRows);

            return Promise.resolve(() => listeners.delete(listener));
        },
        refresh: () => {
            listeners.forEach(listener => listener(initialRows));

            return Promise.resolve();
        },
    };
};

const character = (id: string, key: string) => ({
    id,
    kind: 'character' as const,
    key,
    colorHex: null,
    genderKey: null,
    notes: null,
    backstory: null,
    outline: null,
});

const group = (colorHex = '#112233') => ({
    id: 'group-1',
    kind: 'group' as const,
    key: 'ENSEMBLE',
    colorHex,
    memberIds: [],
});

const createContextValue = (
    overrides: Partial<ScriptCharactersContextValue> = {},
): ScriptCharactersContextValue => ({
    getEditorValue: () => null,
    editorOverrideValue: null,
    normalizedConfirmedCharacterRecords: [],
    normalizedSpeakingEntityRecords: [],
    handleEditorValueChange: () => {},
    confirmedCharacterRecords: [character('character-1', 'ALICE')],
    confirmedGroupRecords: [group()],
    pendingCharacterKeys: [],
    deletingCharacterIds: [],
    renamingCharacterIds: [],
    renamingCharacterKeys: [],
    colorUpdatingCharacterIds: [],
    genderUpdatingCharacterIds: [],
    creatingGroupKeys: [],
    deletingGroupIds: [],
    renamingGroupIds: [],
    colorUpdatingGroupIds: [],
    membershipUpdatingGroupIds: [],
    characterGenderOptions: [],
    isCharactersLoading: false,
    normalizeCharacterNameForInlineInput: name => name,
    handleConfirmCharacter: () => {},
    handleDeleteCharacter: () => {},
    handleRenameCharacterPreview: () => {},
    handleRenameCharacter: async () => {},
    handleSetCharacterColor: () => {},
    handleSetCharacterGender: () => {},
    handleSetCharacterOutline: () => {},
    handleUpsertCharacterGender: () => Promise.resolve(null),
    handleCreateGroup: () => Promise.resolve(null),
    handleDeleteGroup: async () => {},
    handleRenameGroup: () => Promise.resolve(null),
    handleSetGroupColor: async () => {},
    handleReplaceGroupMembers: async () => {},
    ...overrides,
});

const mount = (children: ReactNode) => {
    const host = document.createElement('div');
    const root = createRoot(host);

    document.body.appendChild(host);
    roots.push(root);
    root.render(children);

    return host;
};

afterEach(() => {
    if (activeUnhandledHandler) {
        window.removeEventListener('unhandledrejection', activeUnhandledHandler);
        activeUnhandledHandler = null;
    }

    roots.forEach(root => root.unmount());
    roots.length = 0;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
});

describe('ScriptCharactersSidebar', () => {
    it('keeps Add character open when its normalized name belongs to a group', async () => {
        const handleConfirmCharacter = vi.fn();

        mount(
            <ScriptCharactersProvider value={createContextValue({handleConfirmCharacter})}>
                <ScriptCharactersSidebar />
            </ScriptCharactersProvider>,
        );
        await waitFor(
            () => Boolean(document.querySelector('button[aria-label="Add character"]')),
            'Add character action',
        );

        await userEvent.click(document.querySelector('button[aria-label="Add character"]')!);

        const input = document.querySelector<HTMLInputElement>('#character-name');

        if (!input) {
            throw new Error('Expected character name input');
        }

        await userEvent.fill(input, ' ensemble ');
        await userEvent.keyboard('{Enter}');

        const errorId = input.getAttribute('aria-describedby');
        const error = errorId ? document.getElementById(errorId) : null;

        expect(document.querySelector('dialog[open][aria-label="Add character"]')).not.toBeNull();
        expect(input.getAttribute('aria-invalid')).toBe('true');
        expect(error?.textContent).toContain('character or group');
        expect(input.closest('form')?.contains(error)).toBe(true);
        expect(handleConfirmCharacter).not.toHaveBeenCalled();
    });

    it('handles rejected group color persistence while preserving rollback and catalog error', async () => {
        let releasePersistence!: () => void;
        const persistenceGate = new Promise<void>(resolve => {
            releasePersistence = resolve;
        });
        const charactersSource = createReactiveSource([character('character-1', 'ALICE')]);
        const groupsSource = createReactiveSource([group()]);
        const gendersSource = createReactiveSource([]);
        const repository = {
            getScriptCharactersSource: () => charactersSource,
            getScriptCharacterGroupsSource: () => groupsSource,
            getScriptCharacterGendersSource: () => gendersSource,
            setScriptCharacterGroupColor: async () => {
                await persistenceGate;

                return null;
            },
        } as unknown as ScriptRepository;
        const unhandled: unknown[] = [];

        activeUnhandledHandler = (event: PromiseRejectionEvent) => {
            unhandled.push(event.reason);
            event.preventDefault();
        };

        window.addEventListener('unhandledrejection', activeUnhandledHandler);

        const Harness = () => {
            const catalog = useScriptCharacterCatalog('script-1', repository);
            const context = createContextValue({
                confirmedCharacterRecords: catalog.characters,
                confirmedGroupRecords: catalog.groups,
                colorUpdatingGroupIds: catalog.colorUpdatingGroupIds,
                isCharactersLoading: catalog.isLoading,
                handleSetGroupColor: async (groupId, colorHex) => {
                    await catalog.setGroupColor(groupId, colorHex);
                },
            });

            return (
                <ScriptCharactersProvider value={context}>
                    <ScriptCharactersSidebar />
                    {catalog.error ? <output role="alert">{catalog.error.message}</output> : null}
                </ScriptCharactersProvider>
            );
        };

        mount(<Harness />);
        await waitFor(
            () => Boolean(document.querySelector('[aria-label="Choose color for ENSEMBLE"]')),
            'group color trigger',
        );

        const getTrigger = () => document.querySelector<HTMLElement>(
            '[aria-label="Choose color for ENSEMBLE"]',
        );
        const initialColor = getTrigger()?.style.getPropertyValue('--character-color');

        await userEvent.click(getTrigger()!);
        await userEvent.click(document.querySelector('[aria-label="Select preset color 1"]')!);
        await userEvent.click(Array.from(document.querySelectorAll('button')).find(button => {
            return button.textContent?.trim() === 'Apply';
        })!);
        await waitFor(
            () => getTrigger()?.style.getPropertyValue('--character-color') !== initialColor,
            'optimistic group color',
        );

        releasePersistence();
        await waitFor(
            () => document.querySelector('[role="alert"]')?.textContent?.includes('could not be saved') ?? false,
            'catalog persistence error',
        );
        await waitFor(
            () => getTrigger()?.style.getPropertyValue('--character-color') === initialColor,
            'confirmed group color rollback',
        );
        await new Promise(resolve => window.setTimeout(resolve, 20));

        expect(unhandled).toEqual([]);
        expect(getTrigger()?.getAttribute('aria-disabled')).toBeNull();

        await userEvent.click(getTrigger()!);
        expect(document.querySelector('[aria-label="Color picker for ENSEMBLE"]')).not.toBeNull();

        window.removeEventListener('unhandledrejection', activeUnhandledHandler);
        activeUnhandledHandler = null;
    });
});
