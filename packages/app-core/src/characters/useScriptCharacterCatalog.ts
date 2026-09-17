import type {ScriptRepository} from '@stagistic/db';
import {normalizeCharacterKey} from '@stagistic/script';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {getScriptCharacterGroupsStore} from './scriptCharacterGroupsStore';
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
    const groupsStore = useMemo(() => scriptId
        ? getScriptCharacterGroupsStore(repository, scriptId)
        : null, [repository, scriptId]);
    const charactersStatus = useReactiveCollectionStatus(store?.charactersStatus);
    const gendersStatus = useReactiveCollectionStatus(store?.gendersStatus);
    const actionStatus = useReactiveCollectionStatus(store?.actionStatus);
    const groupsStatus = useReactiveCollectionStatus(groupsStore?.groupsStatus);
    const groupActionStatus = useReactiveCollectionStatus(groupsStore?.actionStatus);
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
    const groupsQuery = useLiveQuery(q => {
        if (!groupsStore) {
            return undefined;
        }

        return q
            .from({groups: groupsStore.groupsCollection})
            .orderBy(({groups}) => groups.key, 'asc');
    }, [groupsStore]);
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
    const pendingGroupActions = groupActionStatus.mutations.filter(
        mutation => mutation.status === 'pending',
    );
    const pendingIds = (action: string) => pendingActions
        .filter(mutation => mutation.action === action)
        .map(mutation => String(mutation.entityKey));
    const pendingGroupIds = (action: string) => pendingGroupActions
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
    const setCharacterVoiceType = useCallback(
        (id: string, value: string | null) => store?.setCharacterVoiceType(id, value)
            ?? Promise.resolve(null),
        [store],
    );
    const setCharacterVocalRange = useCallback(
        (id: string, low: string | null, high: string | null) => store?.setCharacterVocalRange(id, low, high)
            ?? Promise.resolve(null),
        [store],
    );
    const createGender = useCallback(
        (label: string) => store?.createGender(label) ?? Promise.resolve(null),
        [store],
    );
    const hasSpeakingEntityCollision = useCallback((key: string, excludedGroupId?: string) => {
        const normalizedKey = normalizeCharacterKey(key);

        if (!normalizedKey) {
            return true;
        }

        return [...Array.from(store?.charactersCollection.values() ?? []), ...Array.from(groupsStore?.groupsCollection.values() ?? [])].some(entity => {
            return entity.id !== excludedGroupId
                && normalizeCharacterKey(entity.key) === normalizedKey;
        });
    }, [groupsStore, store]);
    const createGroup = useCallback((key: string) => {
        if (!groupsStore || hasSpeakingEntityCollision(key)) {
            return Promise.resolve(null);
        }

        return groupsStore.createGroup(key);
    }, [groupsStore, hasSpeakingEntityCollision]);
    const deleteGroup = useCallback(
        (id: string) => groupsStore?.deleteGroup(id) ?? Promise.resolve(),
        [groupsStore],
    );
    const renameGroup = useCallback((id: string, key: string) => {
        if (!groupsStore || hasSpeakingEntityCollision(key, id)) {
            return Promise.resolve(null);
        }

        return groupsStore.renameGroup(id, key);
    }, [groupsStore, hasSpeakingEntityCollision]);
    const setGroupColor = useCallback(
        (id: string, color: string | null) => groupsStore?.setGroupColor(id, color)
            ?? Promise.resolve(null),
        [groupsStore],
    );
    const replaceGroupMembers = useCallback(
        (id: string, memberIds: string[]) => groupsStore?.replaceGroupMembers(id, memberIds)
            ?? Promise.resolve(null),
        [groupsStore],
    );

    return {
        characters: charactersQuery.data ?? [],
        groups: groupsQuery.data ?? [],
        genderOptions,
        isLoading: Boolean(store) && (
            !charactersStatus.isReady
            || !gendersStatus.isReady
            || !groupsStatus.isReady
            || charactersQuery.isLoading
            || gendersQuery.isLoading
            || groupsQuery.isLoading
        ),
        error: charactersStatus.sourceError
            ?? gendersStatus.sourceError
            ?? groupsStatus.sourceError
            ?? actionStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? groupActionStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? charactersStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? gendersStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? groupsStatus.mutations.find(mutation => mutation.status === 'failed')?.error
            ?? null,
        pendingCharacterKeys: pendingIds('confirm'),
        deletingCharacterIds: pendingIds('delete'),
        renamingCharacterIds: pendingIds('rename'),
        renamingCharacterKeys: pendingIds('renameKey'),
        colorUpdatingCharacterIds: pendingIds('colorHex'),
        genderUpdatingCharacterIds: pendingIds('genderKey'),
        outlineUpdatingCharacterIds: pendingIds('outline'),
        voiceTypeUpdatingCharacterIds: pendingIds('voiceType'),
        vocalRangeUpdatingCharacterIds: pendingIds('vocalRangeLow'),
        creatingGroupKeys: pendingGroupIds('create'),
        deletingGroupIds: pendingGroupIds('delete'),
        renamingGroupIds: pendingGroupIds('key'),
        colorUpdatingGroupIds: pendingGroupIds('colorHex'),
        membershipUpdatingGroupIds: pendingGroupIds('memberIds'),
        confirmCharacter,
        deleteCharacter,
        renameCharacter,
        setCharacterColor,
        setCharacterGender,
        setCharacterOutline,
        setCharacterVoiceType,
        setCharacterVocalRange,
        createGender,
        createGroup,
        deleteGroup,
        renameGroup,
        setGroupColor,
        replaceGroupMembers,
    };
};
