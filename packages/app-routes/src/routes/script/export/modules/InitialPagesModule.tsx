import type {
    BlankPagesValue,
    InitialPagesValue,
} from '@stagistic/export';
import {
    FormSelect,
    type FormSelectOption,
    Switch,
} from '@stagistic/ui';

import {BlankPagesModule} from './BlankPagesModule';
import {
    ExportSettingRow,
    ExportSettingsGroup,
} from './ExportSettingsLayout';
import styles from './modules.module.css';

const CHARACTER_ORDER_OPTIONS: FormSelectOption[] = [
    {
        label: 'name',
        value: 'name',
    }, {
        label: 'first appearance',
        value: 'first-appearance',
    },
];

export const InitialPagesModule = ({
    value,
    blankPages,
    hasAutomaticBalancingBlank,
    onChange,
    onBlankPagesChange,
}: {
    value: InitialPagesValue,
    blankPages: BlankPagesValue,
    hasAutomaticBalancingBlank: boolean,
    onChange: (value: InitialPagesValue) => void,
    onBlankPagesChange: (value: BlankPagesValue) => void,
}) => {
    const page = value.charactersAndPlaces;
    const updatePage = (
        patch: Partial<InitialPagesValue['charactersAndPlaces']>,
    ) => onChange({
        ...value,
        charactersAndPlaces: {
            ...page,
            ...patch,
        },
    });

    return (
        <ExportSettingsGroup>
            <ExportSettingRow>
                <Switch
                    variant="setting"
                    isSelected={value.startEachInitialPageOnOddPage}
                    onChange={startEachInitialPageOnOddPage => onChange({
                        ...value,
                        startEachInitialPageOnOddPage,
                    })}
                >
                    Start each initial page on an odd page
                </Switch>
            </ExportSettingRow>
            <ExportSettingRow>
                <Switch
                    variant="setting"
                    isSelected={value.showPageNumbers}
                    onChange={showPageNumbers => onChange({
                        ...value,
                        showPageNumbers,
                    })}
                >
                    Show page numbers
                </Switch>
            </ExportSettingRow>
            <BlankPagesModule
                value={blankPages}
                hasAutomaticBalancingBlank={hasAutomaticBalancingBlank}
                onChange={onBlankPagesChange}
            />
            <div className={styles.initialPage}>
                <ExportSettingRow>
                    <Switch
                        variant="setting"
                        isSelected={page.enabled}
                        onChange={enabled => updatePage({enabled})}
                    >
                        <span className={styles.initialPageTitle}>Characters</span>
                    </Switch>
                </ExportSettingRow>
                {page.enabled ? (
                    <div className={styles.initialPageOptions}>
                        <ExportSettingRow>
                            <Switch
                                variant="setting"
                                isSelected={page.showCharacterOutlines}
                                onChange={showCharacterOutlines => updatePage({showCharacterOutlines})}
                            >
                                Show character outlines
                            </Switch>
                        </ExportSettingRow>
                        <div className={styles.orderField}>
                            <span className={styles.orderPrefix}>Order characters by</span>
                            <FormSelect
                                ariaLabel="Order characters by"
                                size="md"
                                width="content"
                                options={CHARACTER_ORDER_OPTIONS}
                                value={page.characterOrder}
                                onChange={characterOrder => {
                                    if (
                                        characterOrder === 'name'
                                        || characterOrder === 'first-appearance'
                                    ) {
                                        updatePage({characterOrder});
                                    }
                                }}
                            />
                        </div>
                    </div>
                ) : null}
            </div>
            <div className={styles.placesInitialPage}>
                <ExportSettingRow>
                    <Switch
                        variant="setting"
                        isSelected={page.showPlaces}
                        onChange={showPlaces => updatePage({showPlaces})}
                    >
                        <span className={styles.initialPageTitle}>Places</span>
                    </Switch>
                </ExportSettingRow>
            </div>
        </ExportSettingsGroup>
    );
};
