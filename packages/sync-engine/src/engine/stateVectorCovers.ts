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
