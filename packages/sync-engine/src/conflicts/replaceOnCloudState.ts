import * as Y from 'yjs';

export interface CloudReplacement {
    /** Cloud state + replacement ops: becomes the new local state. */
    doc: Y.Doc,
    /** Only the replacement ops, to send to the server. */
    update: Uint8Array,
}

/**
 * "Use newer" when the local side is newer: applies `replace` on a scratch
 * copy of the cloud state (fetched without merging local state), so the
 * replacement is ordinary Y ops on top of the cloud history (invariant 8).
 * The diverged local Y state is discarded by the caller.
 */
export const replaceOnCloudState = (cloudState: Uint8Array, replace: (doc: Y.Doc) => void): CloudReplacement => {
    const doc = new Y.Doc();

    Y.applyUpdate(doc, cloudState);

    const cloudStateVector = Y.encodeStateVector(doc);

    replace(doc);

    return {
        doc,
        update: Y.encodeStateAsUpdate(doc, cloudStateVector),
    };
};
