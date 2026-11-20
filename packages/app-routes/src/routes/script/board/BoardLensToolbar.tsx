import {type BoardFilterCharacter, BoardToolbar} from '@stagistic/ui';

import {BOARD_LENSES} from './boardLenses';

interface BoardLensToolbarProps {
    activeLensId: string,
    onSelectLens: (lensId: string) => void,
    filterCharacters: readonly BoardFilterCharacter[],
    selectedCharacterIds: readonly string[],
    onSelectedCharacterIdsChange: (ids: string[]) => void,
}

/** The toolbar shared by lenses without card options: the views, the character filter, no View menu. */
export const BoardLensToolbar = ({
    activeLensId,
    onSelectLens,
    filterCharacters,
    selectedCharacterIds,
    onSelectedCharacterIdsChange,
}: BoardLensToolbarProps) => (
    <BoardToolbar
        lenses={BOARD_LENSES}
        activeLensId={activeLensId}
        onSelectLens={onSelectLens}
        filterCharacters={filterCharacters}
        selectedCharacterIds={selectedCharacterIds}
        onSelectedCharacterIdsChange={onSelectedCharacterIdsChange}
    />
);
