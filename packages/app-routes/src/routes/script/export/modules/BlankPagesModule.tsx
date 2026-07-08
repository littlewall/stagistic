import type {BlankPagesValue} from '@stagistic/export';
import {Input} from '@stagistic/ui';

import styles from './modules.module.css';

const clampCount = (value: number) => Math.max(0, Math.min(10, Math.floor(value)));

export const BlankPagesModule = ({
    value,
    onChange,
}: {
    value: BlankPagesValue,
    onChange: (value: BlankPagesValue) => void,
}) => {
    const spec = value.betweenTitleAndScript;

    return (
        <div className={styles.module}>
            <div>
                <h3 className={styles.title}>Blank pages</h3>
                <p className={styles.description}>Insert blank pages before the script body.</p>
            </div>
            <label className={styles.field}>
                <span>Between title page and script</span>
                <Input
                    type="number"
                    min={0}
                    max={10}
                    value={spec.count}
                    onChange={event => onChange({
                        betweenTitleAndScript: {
                            ...spec,
                            count: clampCount(event.currentTarget.valueAsNumber || 0),
                            countsInNumbering: false,
                        },
                    })}
                />
            </label>
        </div>
    );
};
