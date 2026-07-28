import type {BlankPagesValue} from '@stagistic/export';
import {
    InlineTooltip,
    Input,
    Switch,
} from '@stagistic/ui';

import styles from './modules.module.css';

const clampCount = (value: number) => Math.max(1, Math.min(10, Math.floor(value)));
const BALANCING_BLANK_EXPLANATION = 'An additional blank page is added so the script starts on an odd page.';

export const BlankPagesModule = ({
    value,
    hasAutomaticBalancingBlank,
    onChange,
}: {
    value: BlankPagesValue,
    hasAutomaticBalancingBlank: boolean,
    onChange: (value: BlankPagesValue) => void,
}) => {
    const spec = value.betweenInitialPagesAndScript;

    return (
        <div className={styles.module}>
            <div>
                <h3 className={styles.title}>Blank pages</h3>
            </div>
            <Switch
                isSelected={spec.enabled}
                onChange={enabled => onChange({
                    betweenInitialPagesAndScript: {
                        ...spec,
                        enabled,
                    },
                })}
            >
                Blank pages
            </Switch>
            {spec.enabled ? (
                <div className={styles.countField}>
                    <label htmlFor="blank-page-count">Count</label>
                    <Input
                        id="blank-page-count"
                        aria-label="Blank page count"
                        type="number"
                        min={1}
                        max={10}
                        value={spec.count}
                        onChange={event => onChange({
                            betweenInitialPagesAndScript: {
                                ...spec,
                                count: clampCount(
                                    event.currentTarget.valueAsNumber || 1,
                                ),
                            },
                        })}
                    />
                    {hasAutomaticBalancingBlank ? (
                        <InlineTooltip
                            className={styles.balancingBlankIndicator}
                            testId="balancing-blank-indicator"
                            label="+1"
                            tooltip={BALANCING_BLANK_EXPLANATION}
                        />
                    ) : null}
                </div>
            ) : null}
        </div>
    );
};
