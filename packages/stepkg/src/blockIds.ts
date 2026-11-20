import {
    getScriptBlockId,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

export const collectTopLevelBlockIds = (document: ScriptDocument): Set<string> => {
    const ids = new Set<string>();

    (document.content ?? []).forEach((node: ScriptNode) => {
        const id = getScriptBlockId(node);

        if (id) ids.add(id);
    });

    return ids;
};

