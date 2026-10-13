import * as buf from 'lib0/buffer';
import * as Y from 'yjs';

import {stateVectorCovers} from '../stateVectorCovers';
import {
    type CloudScript,
    DOC_KINDS,
    type DocKind,
    type StateVectors,
    type SyncedScriptState,
} from './types';

export const documentNameOf = (scriptId: string, kind: DocKind) => `script/${scriptId}/${kind}`;

export const encodeStateVectors = (docs: Record<DocKind, Y.Doc>): StateVectors => ({
    body: buf.toBase64(Y.encodeStateVector(docs.body)),
    meta: buf.toBase64(Y.encodeStateVector(docs.meta)),
    comments: buf.toBase64(Y.encodeStateVector(docs.comments)),
});

/** `synced` already contained everything in `current` (base64 state vectors). */
const covers = (synced: string | null | undefined, current: string | null | undefined) => {
    if (!current) {
        return true;
    }

    return Boolean(synced) && stateVectorCovers(buf.fromBase64(synced!), buf.fromBase64(current));
};

export const localChangedSince = (docs: Record<DocKind, Y.Doc>, synced: SyncedScriptState | undefined) => {
    const current = encodeStateVectors(docs);

    return !synced || DOC_KINDS.some(kind => !covers(synced.stateVectors[kind], current[kind]));
};

export const cloudChangedSince = (script: CloudScript, synced: SyncedScriptState | undefined) => {
    return !synced || DOC_KINDS.some(kind => !covers(synced.stateVectors[kind], script.stateVectors[kind]));
};
