import {
    BoardAddCharacter,
    type BoardAddCharacterOption,
    BoardInlineHeading,
    BoardSceneCast,
} from '@stagistic/ui';

import type {WallScene} from './buildWallView';
import type {WallSceneMetadata} from './useWallMetadata';

interface BoardSceneBodyProps {
    scene: WallScene,
    showOutline: boolean,
    showCharacters: boolean,
    /** Confirmed characters, for adding one to the card. */
    castOptions: readonly BoardAddCharacterOption[],
    /** Null on a read-only Board. */
    metadata: WallSceneMetadata | null,
}

/** What a full card shows under its name: the outline, then the characters. */
export const BoardSceneBody = ({
    scene,
    showOutline,
    showCharacters,
    castOptions,
    metadata,
}: BoardSceneBodyProps) => {
    const onCard = new Set(scene.chips.map(chip => chip.characterId));

    return (
        <>
            {showOutline && (metadata || scene.synopsis) ? (
                <BoardInlineHeading
                    kind="outline"
                    isReadOnly={!metadata}
                    value={scene.synopsis ?? ''}
                    label={`Outline of scene ${scene.number}`}
                    placeholder="Add scene outline"
                    onCommit={synopsis => {
                        metadata?.updateSynopsis(scene.headingBlockId, synopsis || null);

                        return true;
                    }}
                />
            ) : null}
            {showCharacters ? (
                <BoardSceneCast
                    characters={scene.chips}
                    actions={metadata?.characterActions(scene.headingBlockId)}
                    addControl={metadata ? (
                        <BoardAddCharacter
                            label={`Add character to scene ${scene.number}`}
                            options={castOptions.filter(option => !onCard.has(option.id))}
                            onAdd={characterId => metadata.addCharacter(scene.headingBlockId, characterId)}
                            canCreate={metadata.canCreateCharacter}
                            onCreate={name => metadata.createCharacter(scene.headingBlockId, name)}
                        />
                    ) : undefined}
                />
            ) : null}
        </>
    );
};
