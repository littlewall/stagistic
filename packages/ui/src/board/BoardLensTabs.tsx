import clsx from 'clsx';

import styles from './BoardLensTabs.module.css';

export interface BoardLens {
    id: string,
    label: string,
}

export interface BoardLensTabsProps {
    lenses: readonly BoardLens[],
    activeLensId: string,
    onSelectLens: (lensId: string) => void,
}

/** Views of the Board. The current one carries the ink underline: navigation, not selection. */
export const BoardLensTabs = ({
    lenses,
    activeLensId,
    onSelectLens,
}: BoardLensTabsProps) => (
    <nav className={styles.tabs} aria-label="Board views">
        {lenses.map(lens => {
            const isCurrent = lens.id === activeLensId;

            return (
                <button
                    key={lens.id}
                    type="button"
                    className={clsx(styles.tab, isCurrent && styles.current)}
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => {
                        if (!isCurrent) {
                            onSelectLens(lens.id);
                        }
                    }}
                >
                    {lens.label}
                </button>
            );
        })}
    </nav>
);
