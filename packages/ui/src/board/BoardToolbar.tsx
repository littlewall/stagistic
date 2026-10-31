import clsx from 'clsx';

import {BoardCharacterFilter, type BoardFilterCharacter} from './BoardCharacterFilter';
import {
    BoardLensTabs,
    type BoardLensTabsProps,
} from './BoardLensTabs';
import styles from './BoardToolbar.module.css';
import {BoardViewMenu} from './BoardViewMenu';

export interface BoardToolbarProps extends BoardLensTabsProps {
    filterCharacters: readonly BoardFilterCharacter[],
    selectedCharacterIds: readonly string[],
    onSelectedCharacterIdsChange: (ids: string[]) => void,
    showOnStage: boolean,
    onShowOnStageChange: (show: boolean) => void,
    showOutline: boolean,
    onShowOutlineChange: (show: boolean) => void,
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
    showOnStage,
    onShowOnStageChange,
    showOutline,
    onShowOutlineChange,
    className,
}: BoardToolbarProps) => (
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
            <BoardViewMenu
                showOnStage={showOnStage}
                onShowOnStageChange={onShowOnStageChange}
                showOutline={showOutline}
                onShowOutlineChange={onShowOutlineChange}
            />
        </div>
    </div>
);
