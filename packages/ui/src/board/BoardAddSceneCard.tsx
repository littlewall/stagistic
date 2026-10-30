import type {ReactNode, Ref} from 'react';

import {PlusIcon} from '../icons';
import styles from './BoardAddSceneCard.module.css';

/** The last place in an act: a quiet "Add scene" card, or whatever replaces it (the new scene's form). */
export const BoardAddSceneCard = ({
    ref,
    label,
    onPress,
    children,
}: {
    ref?: Ref<HTMLLIElement>,
    label: string,
    onPress: () => void,
    children?: ReactNode,
}) => (
    <li ref={ref} className={styles.slot}>
        {children ?? (
            <button
                type="button"
                aria-label={label}
                className={styles.card}
                onClick={onPress}
            >
                <PlusIcon aria-hidden="true" />
                Add scene
            </button>
        )}
    </li>
);
