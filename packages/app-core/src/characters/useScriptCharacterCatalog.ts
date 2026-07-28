import type {ScriptRepository} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {getScriptCharactersStore} from './scriptCharactersStoreRegistry';

const defaultGenderOptions = [
    {
        id: 'default:male', key: 'male', label: 'Male',
    }, {
        id: 'default:female', key: 'female', label: 'Female',
    },
];

export const useScriptCharacterCatalog = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptCharactersStore(repository, scriptId)
        : null, [repository, scriptId]);
    const charactersStatus = useReactiveCollectionStatus(store?.charactersStatus);
    const gendersStatus = useReactiveCollectionStatus(store?.gendersStatus);
    const actionStatus = useReactiveCollectionStatus(store?.actionStatus);
    const charactersQuery = useLiveQuery(q => {
        if (!store) {
            return undefined;
        }

        return q
            .from({characters: store.charactersCollection})
            .orderBy(({characters}) => characters.key, 'asc');
    }, [store]);
    const gendersQuery = useLiveQuery(q => {
        if (!store) {
            return undefined;
        }

        return q
            .from({genders: store.gendersCollection})
            .orderBy(({genders}) => genders.label, 'asc');
    }, [store]);
    const genderOptions = useMemo(() => {
        const byKey = new Map(defaultGenderOptions.map(option => [option.key, option]));

        (gendersQuery.data ?? []).forEach(option => {
            if (option.key && option.label) {
                byKey.set(option.key, option);
            }
        });

        return Array.from(byKey.values()).sort((left, right) => {
            return left.label.localeCompare(right.label);
        });
    }, [gendersQuery.data]);
    const pendingActions = actionStatus.mutations.filter(mutation => mutation.status === 'pending');
    const pendingIds = (action: string) => pendingActions
        .filter(mutation => mutation.action === action)
        .map(mutation => String(mutation.entityKey));
    const confirmCharacter = useCallback(
        (key: string, colorHex?: string | null) => store?.confirmCharacter(key, colorHex)
            ?? Promise.resolve(null),
        [store],
    );
    const deleteCharacter = useCallback(
        (id: string) => store?.deleteCharacter(id) ?? Promise.resolve(),
        [store],
    );
    const renameCharacter = useCallback(
        (id: string, key: string) => store?.renameCharacter(id, key) ?? Promise.resolve(null),
        [store],
    );
    const setCharacterColor = useCallback(
        (id: string, value: string | null) => store?.setCharacterColor(id, value)
            ?? Promise.resolve(null),
        [store],
    );
    const setCharacterGender = useCallback(
        (id: string, value: string | null) => store?.setCharacterGender(id, value)
            ?? Promise.resolve(null),
        [store],
    );
    const setCharacterOutline = useCallback(
        (id: string, value: string | null) => store?.setCharacterOutline(id, value)
            ?? Promise.resolve(null),
        [store],
    );
    const createGender = useCallback(
        (label: string) => store?.createGender(label) ?? Promise.resolve(null),
        [store],
    );

    return {
        characters: charactersQuery.data ?? [],
        genderOptions,
        isLoading: Boolean(store) && (
            !charactersStatus.isReady
            || !gendersStatus.isReady
            || charactersQuery.isLoading
            || gendersQuery.isLoading
        ),
        error: charactersStatus.sourceError
            ?? gendersStatus.sourceError
            ?? actionStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? charactersStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? gendersStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
        pendingCharacterKeys: pendingIds('confirm'),
        deletingCharacterIds: pendingIds('delete'),
        renamingCharacterIds: pendingIds('rename'),
        renamingCharacterKeys: pendingIds('renameKey'),
        colorUpdatingCharacterIds: pendingIds('colorHex'),
        genderUpdatingCharacterIds: pendingIds('genderKey'),
        outlineUpdatingCharacterIds: pendingIds('outline'),
        confirmCharacter,
        deleteCharacter,
        renameCharacter,
        setCharacterColor,
        setCharacterGender,
        setCharacterOutline,
        createGender,
    };
};
