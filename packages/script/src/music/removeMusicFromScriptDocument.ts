import {
    getScriptBlockId,
    type ScriptDocument,
    type ScriptNode,
} from '../document';
import {buildScriptBlockIndex} from '../indexing';
import {
    MUSIC_ID_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
} from './constants';

export interface RemoveMusicFromScriptDocumentResult {
    value: ScriptDocument,
    changed: boolean,
}

const getMusicId = (node: ScriptNode) => {
    const musicId = node.attrs?.[MUSIC_ID_ATTR];

    return typeof musicId === 'string' ? musicId : '';
};

export const removeMusicFromScriptDocument = (
    document: ScriptDocument,
    musicId: string,
): RemoveMusicFromScriptDocumentResult => {
    const music = buildScriptBlockIndex(document).snapshot.music
        .find(candidate => candidate.musicId === musicId);

    if (!music) {
        return {value: document, changed: false};
    }

    const explicitEndBlockId = music.endKind === 'explicit'
        ? music.endBlockId
        : null;
    let changed = false;

    const transformNode = (node: ScriptNode): ScriptNode => {
        if (!Array.isArray(node.content)) {
            return node;
        }

        const blockId = getScriptBlockId(node);
        const nextContent = node.content.flatMap(child => {
            const isSelectedStart = child.type === MUSIC_START_NODE_NAME
                && getMusicId(child) === musicId;
            const isPairedOut = child.type === MUSIC_OUT_NODE_NAME
                && blockId === explicitEndBlockId;

            if (isSelectedStart || isPairedOut) {
                changed = true;

                return [];
            }

            return [transformNode(child)];
        });
        const contentChanged = nextContent.some((child, index) => child !== node.content?.[index])
            || nextContent.length !== node.content.length;

        return contentChanged ? {...node, content: nextContent} : node;
    };
    const nextContent = document.content.map(transformNode);

    return changed
        ? {value: {...document, content: nextContent}, changed: true}
        : {value: document, changed: false};
};
