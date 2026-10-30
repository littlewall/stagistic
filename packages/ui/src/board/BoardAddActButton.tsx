import {PlusIcon} from '../icons';
import styles from './BoardAddActButton.module.css';

/** "Add act" set like an act name, so it stands exactly where an act heading would. */
export const BoardAddActButton = ({label = 'Add act', onPress}: {label?: string, onPress: () => void}) => (
    <button
        type="button"
        aria-label={label}
        className={styles.button}
        onClick={onPress}
    >
        <PlusIcon aria-hidden="true" />
        Add act
    </button>
);
