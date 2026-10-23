import {useState} from 'react';

import {AttributeManagerModal} from '../attribute-manager/AttributeManagerModal';
import {ConfirmModal} from '../modal/ConfirmModal';
import type {ScriptStateKind} from './ScriptStateDetailsFields';
import {ScriptStatesBrowser} from './ScriptStatesBrowser';

export interface ScriptStateRecord {
    id: string,
    kind: ScriptStateKind,
    /** “Draft #3” or the version name. */
    label: string,
    name: string | null,
    note: string | null,
    /** Preformatted save date. */
    savedAt: string,
    /** “from Draft #7” for a version marked from a draft. */
    origin: string | null,
    /** Short facts, e.g. “4 scenes”, “12 pages”. */
    facts: readonly string[],
}

export interface ScriptStateUpdate {
    kind: ScriptStateKind,
    name: string,
    note: string,
}

export interface ScriptStatesModalProps {
    isOpen: boolean,
    activeKind: ScriptStateKind,
    states: readonly ScriptStateRecord[],
    /** Stored state on screen; it cannot be opened again. */
    shownStateId: string | null,
    initialSelectedId?: string | null,
    isPending?: boolean,
    onClose: () => void,
    onSelectKind: (kind: ScriptStateKind) => void,
    /** Saves the current script as a new draft or version; absent while a stored state is on screen. */
    onCreate?: (kind: ScriptStateKind) => void,
    onUpdate: (stateId: string, update: ScriptStateUpdate) => void | Promise<void>,
    onDelete: (stateId: string) => void | Promise<void>,
    onOpen: (stateId: string) => void,
    onRestore: (stateId: string) => void,
    onRestoreAsNew: (stateId: string) => void,
}

const TABS = [{id: 'draft', label: 'Drafts'}, {id: 'version', label: 'Versions'}];

/**
 * Stored drafts and versions of a script, managed like the attribute manager:
 * a list per kind and an editable detail for the selected state.
 */
export const ScriptStatesModal = ({
    isOpen,
    activeKind,
    states,
    shownStateId,
    initialSelectedId = null,
    isPending = false,
    onClose,
    onSelectKind,
    onCreate,
    onUpdate,
    onDelete,
    onOpen,
    onRestore,
    onRestoreAsNew,
}: ScriptStatesModalProps) => {
    const [deleteTarget, setDeleteTarget] = useState<ScriptStateRecord | null>(null);

    return (
        <>
            <AttributeManagerModal
                isOpen={isOpen}
                title="Drafts and versions"
                tabs={TABS}
                activeTabId={activeKind}
                onClose={onClose}
                onSelectTab={tabId => onSelectKind(tabId === 'version' ? 'version' : 'draft')}
            >
                <ScriptStatesBrowser
                    // A new requested selection (after saving or marking as version) starts a fresh list.
                    key={`${activeKind}:${initialSelectedId ?? ''}`}
                    kind={activeKind}
                    states={states.filter(state => state.kind === activeKind)}
                    shownStateId={shownStateId}
                    initialSelectedId={initialSelectedId}
                    isPending={isPending}
                    onCreate={onCreate}
                    onUpdate={onUpdate}
                    onRequestDelete={setDeleteTarget}
                    onOpen={onOpen}
                    onRestore={onRestore}
                    onRestoreAsNew={onRestoreAsNew}
                />
            </AttributeManagerModal>
            <ConfirmModal
                isOpen={deleteTarget !== null}
                ariaLabel={`Delete ${deleteTarget?.label ?? ''}`}
                title={`Delete ${deleteTarget?.label ?? ''}?`}
                changes={[
                    {
                        tone: 'out',
                        label: 'Deleted',
                        text: `${deleteTarget?.label ?? 'This state'}, permanently`,
                    },
                    {
                        tone: 'kept',
                        label: 'Unchanged',
                        text: 'The current script',
                    },
                ]}
                confirmLabel="Delete"
                isPending={isPending}
                lockWhilePending
                onClose={() => setDeleteTarget(null)}
                onConfirm={async () => {
                    if (!deleteTarget) {
                        return;
                    }

                    await onDelete(deleteTarget.id);
                    setDeleteTarget(null);
                }}
            />
        </>
    );
};
