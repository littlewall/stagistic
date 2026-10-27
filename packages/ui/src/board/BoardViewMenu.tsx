import {Checkbox} from '../atoms/Checkbox/Checkbox';
import {Text} from '../primitives/Text/Text';
import {BoardMenuButton} from './BoardMenuButton';
import styles from './BoardViewMenu.module.css';

export interface BoardViewMenuProps {
    showOnStage: boolean,
    onShowOnStageChange: (show: boolean) => void,
    showMentioned: boolean,
    onShowMentionedChange: (show: boolean) => void,
}

/** "View": what scene cards show. Each option adds something and stands alone. */
export const BoardViewMenu = ({
    showOnStage,
    onShowOnStageChange,
    showMentioned,
    onShowMentionedChange,
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
                    Characters on stage
                </Checkbox>
                <Checkbox
                    className={styles.option}
                    isSelected={showMentioned}
                    onChange={onShowMentionedChange}
                >
                    <span className={styles.optionText}>
                        <span>Mentioned characters</span>
                        <span className={styles.hint}>Named in dialogue or lyrics only</span>
                    </span>
                </Checkbox>
            </>
        )}
    >
        View
    </BoardMenuButton>
);
