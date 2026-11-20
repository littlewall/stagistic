import clsx from 'clsx';

import {BoardCharacterFilter, type BoardFilterCharacter} from './BoardCharacterFilter';
import {
    BoardLensTabs,
    type BoardLensTabsProps,
} from './BoardLensTabs';
import styles from './BoardToolbar.module.css';
import {BoardViewMenu} from './BoardViewMenu';

export interface BoardToolbarCardOptions {
    showOnStage: boolean,
    onShowOnStageChange: (show: boolean) => void,
    showOutline: boolean,
    onShowOutlineChange: (show: boolean) => void,
}

export interface BoardToolbarProps extends BoardLensTabsProps {
    filterCharacters: readonly BoardFilterCharacter[],
    selectedCharacterIds: readonly string[],
    onSelectedCharacterIdsChange: (ids: string[]) => void,
    /** Card options ("View"); omitted on lenses without cards, e.g. the Matrix. */
    cardOptions?: BoardToolbarCardOptions,
    className?: string,
}

/** One row: the Board's views on the left, character filter and card options on the right. */
export const BoardToolbar = ({
    lenses,
    activeLensId,
    onSelectLens,
    filterCharacters,
    selectedCharacterIds,
    onSelectedCharacterIdsChange,
    cardOptions,
    className,
}: BoardToolbarProps) => {
    return (
        <div
            className={clsx(styles.toolbar, className)}
            role="group"
            aria-label="Board options"
        >
            <BoardLensTabs
                lenses={lenses}
                activeLensId={activeLensId}
                onSelectLens={onSelectLens}
            />
            <div className={styles.controls}>
                <BoardCharacterFilter
                    characters={filterCharacters}
                    selectedIds={selectedCharacterIds}
                    onChange={onSelectedCharacterIdsChange}
                />
                {cardOptions ? (
                    <BoardViewMenu
                        showOnStage={cardOptions.showOnStage}
                        onShowOnStageChange={cardOptions.onShowOnStageChange}
                        showOutline={cardOptions.showOutline}
                        onShowOutlineChange={cardOptions.onShowOutlineChange}
                    />
                ) : null}
            </div>
        </div>
    );
};
