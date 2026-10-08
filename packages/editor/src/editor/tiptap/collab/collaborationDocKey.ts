import type {Doc as YDoc} from 'yjs';

const keys = new WeakMap<YDoc, number>();
let nextKey = 0;

/** Stable per-instance key for a Y.Doc (guids can repeat across replicas). */
export const getCollaborationDocKey = (doc: YDoc) => {
    let key = keys.get(doc);

    if (key === undefined) {
        key = ++nextKey;
        keys.set(doc, key);
    }

    return key;
};
