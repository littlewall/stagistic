import * as buf from 'lib0/buffer';
import * as Y from 'yjs';

export const encodeStateVectorBase64 = (doc: Y.Doc) => buf.toBase64(Y.encodeStateVector(doc));

/** Order-independent comparison of two encoded state vectors. */
export const stateVectorsEqual = (left: Uint8Array, right: Uint8Array) => {
    const leftMap = Y.decodeStateVector(left);
    const rightMap = Y.decodeStateVector(right);

    if (leftMap.size !== rightMap.size) {
        return false;
    }

    for (const [client, clock] of leftMap) {
        if (rightMap.get(client) !== clock) {
            return false;
        }
    }

    return true;
};

/** `true` when `doc` has changes beyond the last synced state vector. */
export const hasChangedSince = (doc: Y.Doc, lastSyncedBase64: string | null) => {
    if (lastSyncedBase64 === null) {
        return true;
    }

    return !stateVectorsEqual(Y.encodeStateVector(doc), buf.fromBase64(lastSyncedBase64));
};
