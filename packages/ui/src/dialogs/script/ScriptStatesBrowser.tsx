import clsx from 'clsx';
import {useMemo, useState} from 'react';

import {Button} from '../../atoms/Button/Button';
import {Input} from '../../atoms/Input/Input';
import {Tooltip} from '../../atoms/Tooltip/Tooltip';
import {
    PlusIcon,
    SearchIcon,
    TrashIcon,
} from '../../icons';
import {ScriptStateDetail} from './ScriptStateDetail';
import type {ScriptStateKind} from './ScriptStateDetailsFields';
import type {ScriptStateRecord, ScriptStateUpdate} from './ScriptStatesModal';
import styles from './ScriptStatesModal.module.css';

interface ScriptStatesBrowserProps {
    kind: ScriptStateKind,
    states: readonly ScriptStateRecord[],
    shownStateId: string | null,
    initialSelectedId: string | null,
    isPending: boolean,
    onCreate?: (kind: ScriptStateKind, returnFocus?: HTMLElement | null) => void,
    onUpdate: (stateId: string, update: ScriptStateUpdate) => void | Promise<void>,
    onRequestDelete: (state: ScriptStateRecord, returnFocus?: HTMLElement | null) => void,
    onOpen: (stateId: string) => void,
    onRestore: (stateId: string, returnFocus?: HTMLElement | null) => void,
    onRestoreAsNew: (stateId: string, returnFocus?: HTMLElement | null) => void,
}

const COPY: Record<ScriptStateKind, {
    singular: string,
    plural: string,
    create: string,
}> = {
    draft: {
        singular: 'Draft',
        plural: 'drafts',
        create: 'Save the current script as a new draft',
    },
    version: {
        singular: 'Version',
        plural: 'versions',
        create: 'Save the current script as a version',
    },
};

const describe = (state: ScriptStateRecord) => [state.savedAt, state.note].filter(Boolean).join(' · ');

/** List of one kind of stored states with the detail of the selected one. */
export const ScriptStatesBrowser = ({
    kind,
    states,
    shownStateId,
    initialSelectedId,
    isPending,
    onCreate,
    onUpdate,
    onRequestDelete,
    onOpen,
    onRestore,
    onRestoreAsNew,
}: ScriptStatesBrowserProps) => {
    const copy = COPY[kind];
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState(initialSelectedId);
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const visibleStates = useMemo(() => {
        if (!normalizedQuery) {
            return states;
        }

        return states.filter(state => `${state.label} ${state.note ?? ''}`.toLocaleLowerCase().includes(normalizedQuery));
    }, [normalizedQuery, states]);
    const selected = states.find(state => state.id === selectedId) ?? states[0] ?? null;

    return (
        <div className={styles.panel}>
            <aside className={styles.browser} aria-label={`${copy.singular} list`}>
                <div className={styles.searchRow}>
                    <div className={styles.searchField}>
                        <SearchIcon className={styles.searchIcon} aria-hidden="true" />
                        <Input
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            placeholder="Search"
                            aria-label={`Search ${copy.plural}`}
                        />
                    </div>
                    {onCreate ? (
                        <Tooltip label={copy.create}>
                            <Button
                                className={styles.iconButton}
                                variant="ghost"
                                size="sm"
                                aria-label={copy.create}
                                onPress={event => onCreate(kind, event.target as HTMLElement)}
                            >
                                <PlusIcon className={styles.actionIcon} aria-hidden="true" />
                            </Button>
                        </Tooltip>
                    ) : null}
                </div>
                <ul className={styles.list}>
                    {visibleStates.map(state => (
                        <li key={state.id}>
                            <button
                                type="button"
                                className={clsx(styles.listItem, state.id === selected?.id && styles.selected)}
                                aria-pressed={state.id === selected?.id}
                                onClick={() => setSelectedId(state.id)}
                            >
                                <span className={styles.itemLabel}>
                                    {state.label}
                                    {state.id === shownStateId ? <span className={styles.itemShown}>On screen</span> : null}
                                </span>
                                <span className={styles.itemDetail}>{describe(state)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
                {visibleStates.length === 0 ? (
                    <p className={styles.emptyList}>{states.length === 0 ? `No ${copy.plural} yet` : `No ${copy.plural} match your search`}</p>
                ) : null}
            </aside>
            <section className={styles.detailColumn} aria-label={`${copy.singular} detail`}>
                {selected ? (
                    <>
                        <header className={styles.detailHeader}>
                            <div className={styles.detailIdentity}>
                                <p className={styles.detailType}>{copy.singular}</p>
                                <h3 className={styles.detailTitle}>{selected.label}</h3>
                                <p className={styles.detailFacts}>{[
                                    selected.origin,
                                    `Saved ${selected.savedAt}`,
                                    ...selected.facts,
                                ].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            <Tooltip label={`Delete ${selected.label}`} placement="left">
                                <Button
                                    className={clsx(styles.iconButton, styles.deleteButton)}
                                    variant="ghost"
                                    size="sm"
                                    isDisabled={isPending}
                                    aria-label={`Delete ${selected.label}`}
                                    onPress={event => onRequestDelete(selected, event.target as HTMLElement)}
                                >
                                    <TrashIcon className={styles.actionIcon} aria-hidden="true" />
                                </Button>
                            </Tooltip>
                        </header>
                        <div className={styles.detailBody}>
                            <ScriptStateDetail
                                key={selected.id}
                                state={selected}
                                isShown={selected.id === shownStateId}
                                isPending={isPending}
                                onUpdate={update => onUpdate(selected.id, update)}
                                onOpen={() => onOpen(selected.id)}
                                onRestore={trigger => onRestore(selected.id, trigger)}
                                onRestoreAsNew={trigger => onRestoreAsNew(selected.id, trigger)}
                            />
                        </div>
                    </>
                ) : (
                    <div className={styles.emptyDetail}>
                        <p>{onCreate ? `No ${copy.plural} yet. Use + to keep the current script as one.` : `No ${copy.plural} yet.`}</p>
                    </div>
                )}
            </section>
        </div>
    );
};
