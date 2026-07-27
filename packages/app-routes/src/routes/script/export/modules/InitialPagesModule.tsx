import type {InitialPagesValue} from '@stagistic/export';
import {
    FormSelect,
    type FormSelectOption,
    Switch,
} from '@stagistic/ui';

import styles from './modules.module.css';

const CHARACTER_ORDER_OPTIONS: FormSelectOption[] = [
    {
        label: 'Name',
        value: 'name',
    }, {
        label: 'First appearance',
        value: 'first-appearance',
    },
];

export const InitialPagesModule = ({
    value,
    onChange,
}: {
    value: InitialPagesValue,
    onChange: (value: InitialPagesValue) => void,
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
        <div className={styles.module}>
            <div>
                <h3 className={styles.title}>Initial pages</h3>
            </div>
            <Switch
                isSelected={value.startEachInitialPageOnOddPage}
                onChange={startEachInitialPageOnOddPage => onChange({
                    ...value,
                    startEachInitialPageOnOddPage,
                })}
            >
                Start each initial page on an odd page
            </Switch>
            <Switch
                isSelected={value.showPageNumbers}
                onChange={showPageNumbers => onChange({
                    ...value,
                    showPageNumbers,
                })}
            >
                Show page numbers
            </Switch>
            <div className={styles.initialPage}>
                <Switch
                    isSelected={page.enabled}
                    onChange={enabled => updatePage({enabled})}
                >
                    <span className={styles.initialPageTitle}>Characters and places</span>
                </Switch>
                {page.enabled ? (
                    <div className={styles.initialPageOptions}>
                        <section className={styles.initialPageSection}>
                            <h4 className={styles.sectionTitle}>Characters</h4>
                            <div className={styles.sectionOptions}>
                                <Switch
                                    isSelected={page.showCharacterOutlines}
                                    onChange={showCharacterOutlines => updatePage({showCharacterOutlines})}
                                >
                                    Show character outlines
                                </Switch>
                                <div className={styles.orderField}>
                                    <span className={styles.orderPrefix}>Order characters by</span>
                                    <FormSelect
                                        ariaLabel="Order characters by"
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
                        </section>
                        <section className={styles.initialPageSection}>
                            <h4 className={styles.sectionTitle}>Places</h4>
                            <div className={styles.sectionOptions}>
                                <Switch
                                    isSelected={page.showPlaces}
                                    onChange={showPlaces => updatePage({showPlaces})}
                                >
                                    Show places
                                </Switch>
                            </div>
                        </section>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
