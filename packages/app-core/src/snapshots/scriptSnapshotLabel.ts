import type {ScriptSnapshot} from '@stagistic/db';

type SnapshotIdentity = Pick<ScriptSnapshot, 'kind' | 'number' | 'name'>;

/** UI label: “Draft 3” for a draft, the name for a version. */
export const getScriptSnapshotLabel = (snapshot: SnapshotIdentity): string => {
    if (snapshot.kind === 'version') {
        return snapshot.name ?? 'Untitled version';
    }

    return snapshot.number === null ? 'Draft' : `Draft ${snapshot.number}`;
};

/** “from Draft 7” for a version that was marked from a draft. */
export const getScriptSnapshotOrigin = (snapshot: SnapshotIdentity): string | null => {
    return snapshot.kind === 'version' && snapshot.number !== null ? `from Draft ${snapshot.number}` : null;
};
