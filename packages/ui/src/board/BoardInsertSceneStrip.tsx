import {Tooltip} from '../atoms/Tooltip/Tooltip';
import {PlusIcon} from '../icons';
import styles from './BoardInsertSceneStrip.module.css';

/** A hairline in the gap before a card; it widens into a "+" when pointed at or focused. */
export const BoardInsertSceneStrip = ({label, onPress}: {label: string, onPress: () => void}) => (
    <Tooltip label="Add scene" delay={300}>
        <button
            type="button"
            aria-label={label}
            className={styles.strip}
            onClick={onPress}
        >
            <PlusIcon aria-hidden="true" />
        </button>
    </Tooltip>
);
