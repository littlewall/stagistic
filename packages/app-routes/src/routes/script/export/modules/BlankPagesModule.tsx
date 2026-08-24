import type {BlankPagesValue} from '@stagistic/export';
import {
    FormSelect,
    type FormSelectOption,
    InlineTooltip,
} from '@stagistic/ui';

import {ExportSettingsGroup} from './ExportSettingsLayout';
import styles from './modules.module.css';

const NO_BLANK_PAGES = 'none';
const BLANK_PAGE_OPTIONS: FormSelectOption[] = [
    {
        label: NO_BLANK_PAGES,
        value: NO_BLANK_PAGES,
    }, ...Array.from({length: 10}, (_, index) => ({
        label: String(index + 1),
        value: index + 1,
    })),
];
const normalizeCount = (count: number) => Math.max(1, Math.min(10, Math.floor(count)));
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
    const count = normalizeCount(spec.count);

    return (
        <ExportSettingsGroup>
            <div className={styles.countField}>
                <label htmlFor="blank-page-count">Blank pages</label>
                <span>
                    {spec.enabled && hasAutomaticBalancingBlank ? (
                        <InlineTooltip
                            testId="balancing-blank-indicator"
                            label="+1"
                            tooltip={BALANCING_BLANK_EXPLANATION}
                        />
                    ) : null}
                </span>
                <FormSelect
                    id="blank-page-count"
                    ariaLabel="Blank page count"
                    size="md"
                    width="content"
                    options={BLANK_PAGE_OPTIONS}
                    value={spec.enabled ? count : NO_BLANK_PAGES}
                    onChange={next => onChange({
                        betweenInitialPagesAndScript: {
                            ...spec,
                            enabled: next !== NO_BLANK_PAGES,
                            count: typeof next === 'number' ? next : count,
                        },
                    })}
                />
            </div>
        </ExportSettingsGroup>
    );
};
