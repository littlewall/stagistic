import {
    buildScriptBlockIndex,
    type ScriptDocument,
} from '@stagistic/script';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    getConfirmedCharacterColor,
    normalizePersistentCharacterRefs,
} from '../characters/colorResolver';
import type {PersistentCharacterRef} from '../contracts';
import {buildSidebarProjectionFromIndex} from '../live/buildSidebarProjectionFromIndex';
import {
    createEditorSnapshotStore,
    type EditorSnapshotStore,
} from '../live/store';
import {
    type CharacterColorRefsBundle,
    createCharacterColorRefsBundle,
} from '../surface/editorSurfaceCache';

interface UseEditorCharacterColorsArgs {
    persistentCharacters: readonly PersistentCharacterRef[],
    characterColorSaturation: number | undefined,
    resolvedInitialValue: ScriptDocument,
    /** Externally-owned containers (cached editor surface); falls back to per-mount ones. */
    refs?: CharacterColorRefsBundle,
    liveStore?: EditorSnapshotStore,
}

export const useEditorCharacterColors = ({
    persistentCharacters,
    characterColorSaturation,
    resolvedInitialValue,
    refs,
    liveStore: providedLiveStore,
}: UseEditorCharacterColorsArgs) => {
    const localRefs = useRef<CharacterColorRefsBundle | null>(null);

    if (!localRefs.current) {
        localRefs.current = createCharacterColorRefsBundle();
    }

    const {
        colorByCharacterIdRef,
        rememberedColorByKeyRef,
        rememberedColorSaturationRef,
        persistentCharactersRef,
    } = refs ?? localRefs.current;

    const normalizedPersistentCharacters = useMemo(
        () => normalizePersistentCharacterRefs(persistentCharacters),
        [persistentCharacters],
    );

    const confirmedCharacterColorsById = useMemo(() => {
        const resolvedColors = new Map<string, string>();

        normalizedPersistentCharacters.forEach(character => {
            resolvedColors.set(
                character.id,
                getConfirmedCharacterColor(
                    character.id,
                    character.colorHex,
                    characterColorSaturation,
                ),
            );
        });

        return resolvedColors;
    }, [normalizedPersistentCharacters, characterColorSaturation]);

    const confirmedCharacterColorsByKey = useMemo(() => {
        const resolvedColors = new Map<string, string>();

        normalizedPersistentCharacters.forEach(character => {
            const color = confirmedCharacterColorsById.get(character.id);

            if (!color) {
                return;
            }

            resolvedColors.set(character.key, color);
        });

        return resolvedColors;
    }, [confirmedCharacterColorsById, normalizedPersistentCharacters]);

    useEffect(() => {
        const nextColorByCharacterId = new Map(colorByCharacterIdRef.current);
        const didSaturationChange = rememberedColorSaturationRef.current !== null
            && rememberedColorSaturationRef.current !== characterColorSaturation;
        const nextRememberedColorByKey = didSaturationChange
            ? new Map<string, string>()
            : new Map(rememberedColorByKeyRef.current);

        confirmedCharacterColorsById.forEach((color, characterId) => {
            nextColorByCharacterId.set(characterId, color);
        });
        confirmedCharacterColorsByKey.forEach((color, characterKey) => {
            nextRememberedColorByKey.set(characterKey, color);
        });

        persistentCharactersRef.current = normalizedPersistentCharacters;
        colorByCharacterIdRef.current = nextColorByCharacterId;
        rememberedColorByKeyRef.current = nextRememberedColorByKey;
        rememberedColorSaturationRef.current = characterColorSaturation ?? null;
    }, [
        confirmedCharacterColorsById,
        confirmedCharacterColorsByKey,
        normalizedPersistentCharacters,
        characterColorSaturation,
    ]);

    const initialLiveSnapshot = useMemo(() => {
        const indexSnapshot = buildScriptBlockIndex(resolvedInitialValue).snapshot;
        const projection = buildSidebarProjectionFromIndex(indexSnapshot, {
            characterColorSaturation,
            colorByCharacterId: confirmedCharacterColorsById,
            rememberedColorByKey: confirmedCharacterColorsByKey,
            persistentCharacters: normalizedPersistentCharacters,
        });

        return {
            revision: 0,
            index: indexSnapshot,
            structure: projection.structure,
            characters: projection.characters,
            music: indexSnapshot.music,
            activeBlockId: null,
            activeBlockType: null,
        };
    }, [
        confirmedCharacterColorsById,
        confirmedCharacterColorsByKey,
        normalizedPersistentCharacters,
        resolvedInitialValue,
        characterColorSaturation,
    ]);

    const [localLiveStore] = useState(() => createEditorSnapshotStore(initialLiveSnapshot));
    const liveStore = providedLiveStore ?? localLiveStore;
    const initializedLiveStoreRef = useRef<EditorSnapshotStore | null>(null);

    useEffect(() => {
        if (!providedLiveStore || initializedLiveStoreRef.current === providedLiveStore) {
            return;
        }

        initializedLiveStoreRef.current = providedLiveStore;
        providedLiveStore.setSnapshot(initialLiveSnapshot);
    }, [initialLiveSnapshot, providedLiveStore]);

    return {
        colorByCharacterIdRef,
        rememberedColorByKeyRef,
        persistentCharactersRef,
        confirmedCharacterColorsById,
        liveStore,
    };
};
