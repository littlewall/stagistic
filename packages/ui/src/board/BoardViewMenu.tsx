import {Checkbox} from '../atoms/Checkbox/Checkbox';
import {Text} from '../primitives/Text/Text';
import {BoardMenuButton} from './BoardMenuButton';
import styles from './BoardViewMenu.module.css';

export interface BoardViewMenuProps {
    showOnStage: boolean,
    onShowOnStageChange: (show: boolean) => void,
}

/** "View": what scene cards show. Each option adds something and stands alone. */
export const BoardViewMenu = ({
    showOnStage,
    onShowOnStageChange,
}: BoardViewMenuProps) => (
    <BoardMenuButton
        panelLabel="Show on cards"
        panel={(
            <>
                <Text
                    as="h2"
                    variant="eyebrow"
                    size="xs"
                    className={styles.title}
                >
                    Show on cards
                </Text>
                <Checkbox
                    className={styles.option}
                    isSelected={showOnStage}
                    onChange={onShowOnStageChange}
                >
                    Characters
                </Checkbox>
            </>
        )}
    >
        View
    </BoardMenuButton>
);
