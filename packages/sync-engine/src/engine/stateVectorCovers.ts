import * as Y from 'yjs';

/** `true` when `current` contains every update described by `required`. */
export const stateVectorCovers = (current: Uint8Array, required: Uint8Array) => {
    const have = Y.decodeStateVector(current);

    for (const [client, clock] of Y.decodeStateVector(required)) {
        if ((have.get(client) ?? 0) < clock) {
            return false;
        }
    }

    return true;
};

/** Resolves once `doc` covers `stateVector`, or after `timeoutMs` (then calls `onTimeout`). */
export const waitForStateVector = (doc: Y.Doc, stateVector: Uint8Array, timeoutMs: number, onTimeout: () => void) => new Promise<void>(resolve => {
    if (stateVectorCovers(Y.encodeStateVector(doc), stateVector)) {
        resolve();

        return;
    }

    const timeout = setTimeout(() => {
        doc.off('update', check);
        onTimeout();
        resolve();
    }, timeoutMs);
    const check = () => {
        if (stateVectorCovers(Y.encodeStateVector(doc), stateVector)) {
            clearTimeout(timeout);
            doc.off('update', check);
            resolve();
        }
    };

    doc.on('update', check);
});
