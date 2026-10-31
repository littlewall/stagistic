import {
    useSceneMetadataActions,
    useScriptRepository,
    useScriptSceneCharacters,
    useScriptSceneSynopses,
} from '@stagistic/app-core';
import {normalizeCharacterKey} from '@stagistic/script';
import type {BoardCharacterActions, BoardCharacterChip} from '@stagistic/ui';
import {useMemo} from 'react';

import {useScriptReadOnlyState} from '../workspace/ScriptAccessContext';
import {useScriptCharacters} from '../workspace/ScriptCharactersContext';
import {useScriptWorkspace} from '../workspace/ScriptWorkspaceContext';
import {resolveCharacterColor} from './buildWallView';

export interface WallSceneMetadata {
    /** Outline edits; null clears it. */
    updateSynopsis: (headingBlockId: string, synopsis: string | null) => void,
    characterActions: (headingBlockId: string) => BoardCharacterActions,
    addCharacter: (headingBlockId: string, characterId: string) => void,
    /** Whether a typed name is free to become a new character. */
    canCreateCharacter: (name: string) => boolean,
    createCharacter: (headingBlockId: string, name: string) => void,
}

const ignore = (promise: Promise<unknown>) => {
    promise.catch(() => undefined);
};

/*
 * Card records and outlines of the open script (or of the stored state on screen, read-only),
 * and the writes the Wall makes to them. Metadata is not part of the document history.
 */
export const useWallMetadata = (displayColorByKey: ReadonlyMap<string, string>) => {
    const repository = useScriptRepository();
    const {currentScriptId, trackSave} = useScriptWorkspace();
    const {isReadOnly} = useScriptReadOnlyState();
    const {
        confirmedCharacterRecords,
        confirmedGroupRecords,
        handleConfirmCharacter,
    } = useScriptCharacters();
    const {sceneCharacters} = useScriptSceneCharacters(currentScriptId, repository);
    const {sceneSynopses} = useScriptSceneSynopses(currentScriptId, repository);
    const actions = useSceneMetadataActions(currentScriptId ?? '', repository, isReadOnly);

    const synopsisByScene = useMemo(
        () => new Map(sceneSynopses.map(row => [row.headingBlockId, row.synopsis])),
        [sceneSynopses],
    );

    const castOptions = useMemo(() => confirmedCharacterRecords.map(character => ({
        id: character.id,
        name: character.key,
        color: resolveCharacterColor(character, displayColorByKey),
    })), [confirmedCharacterRecords, displayColorByKey]);

    const metadata = useMemo<WallSceneMetadata>(() => {
        const takenKeys = new Set([...confirmedCharacterRecords, ...confirmedGroupRecords].map(record => normalizeCharacterKey(record.key)));
        const save = (write: () => Promise<unknown>) => ignore(trackSave(write));
        const confirm = async (name: string) => {
            const character = await handleConfirmCharacter(name);

            if (!character && !confirmedCharacterRecords.some(record => record.key === normalizeCharacterKey(name))) {
                throw new Error('The character could not be confirmed');
            }
        };
        const arcOf = (headingBlockId: string, characterId: string) => sceneCharacters
            .find(row => row.headingBlockId === headingBlockId && row.characterId === characterId)?.arcValue ?? null;
        const put = (headingBlockId: string, characterId: string, note?: string | null) => save(
            () => actions.putSceneCharacter(headingBlockId, characterId, note === undefined ? {} : {note}),
        );

        return {
            updateSynopsis: (headingBlockId, synopsis) => save(() => actions.updateSceneSynopsis(headingBlockId, synopsis)),
            characterActions: headingBlockId => ({
                // A cleared note of a character the script already places leaves no record behind, unless an arc keeps it.
                onNoteCommit: (chip: BoardCharacterChip, note: string | null) => {
                    if (!chip.characterId) return;

                    if (note === null && chip.source === 'script' && arcOf(headingBlockId, chip.characterId) === null) {
                        const characterId = chip.characterId;

                        save(() => actions.removeSceneCharacter(headingBlockId, characterId));
                    } else {
                        put(headingBlockId, chip.characterId, note);
                    }
                },
                onRemove: chip => {
                    const characterId = chip.characterId;

                    if (characterId) save(() => actions.removeSceneCharacter(headingBlockId, characterId));
                },
                onConfirm: chip => save(() => confirm(chip.name)),
            }),
            addCharacter: (headingBlockId, characterId) => put(headingBlockId, characterId),
            canCreateCharacter: name => {
                const key = normalizeCharacterKey(name);

                return key !== '' && !takenKeys.has(key);
            },
            createCharacter: (headingBlockId, name) => {
                save(() => actions.createSceneCharacter(headingBlockId, name));
                // Reuse the workspace's document linking after the shared catalog write succeeds.
                save(() => confirm(name));
            },
        };
    }, [
        actions,
        confirmedCharacterRecords,
        confirmedGroupRecords,
        handleConfirmCharacter,
        sceneCharacters,
        trackSave,
    ]);

    return {
        records: sceneCharacters,
        synopsisByScene,
        castOptions,
        metadata: isReadOnly ? null : metadata,
    };
};
