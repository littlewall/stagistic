import {
    CHARACTER_TAG_ID_ATTR,
    CHARACTER_TAG_KEY_ATTR,
    CHARACTER_TAG_MARK_NAME,
    extractCharacterKeys,
    getScriptBlockId,
    getScriptBlockNodeType,
    isScriptBlockNode,
    normalizeCharacterKey,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

export interface SceneGroup {
    actBlockId: string | null,
    sceneBlockId: string | null,
    blocks: ScriptNode[],
}

const getTextContent = (node: ScriptNode): string => {
    const ownText = typeof node.text === 'string' ? node.text : '';
    const childText = node.content?.map(getTextContent).join('') ?? '';

    return `${ownText}${childText}`;
};

const hasMatchingTag = (
    node: ScriptNode,
    character: {id: string, key: string},
): boolean => {
    const marks = node.marks ?? [];

    return marks.some(mark => {
        if (mark.type !== CHARACTER_TAG_MARK_NAME) {
            return false;
        }

        const id = mark.attrs?.[CHARACTER_TAG_ID_ATTR];
        const key = mark.attrs?.[CHARACTER_TAG_KEY_ATTR];

        if (typeof id === 'string' && id === character.id) {
            return true;
        }

        return typeof key === 'string'
            && normalizeCharacterKey(key) === normalizeCharacterKey(character.key);
    });
};

const nodeMentionsCharacter = (
    node: ScriptNode,
    character: {id: string, key: string},
): boolean => {
    if (hasMatchingTag(node, character)) {
        return true;
    }

    const text = getTextContent(node);
    const normalizedKey = normalizeCharacterKey(character.key);
    const taggedTextKeys = Array.from(text.matchAll(/@([A-Z][A-Z0-9_ -]*)/gu))
        .map(match => normalizeCharacterKey(match[1] ?? ''));

    if (extractCharacterKeys(text).some(key => key === normalizedKey)
        || taggedTextKeys.some(key => key === normalizedKey)) {
        return true;
    }

    return node.content?.some(child => nodeMentionsCharacter(child, character)) ?? false;
};

const createImplicitGroup = (currentAct: string | null): SceneGroup => ({
    actBlockId: currentAct,
    sceneBlockId: null,
    blocks: [],
});

export const groupScenes = (doc: ScriptDocument): SceneGroup[] => {
    const groups: SceneGroup[] = [];
    let currentAct: string | null = null;

    doc.content.forEach(block => {
        if (!isScriptBlockNode(block)) {
            const group = groups.at(-1) ?? createImplicitGroup(currentAct);

            if (!groups.includes(group)) {
                groups.push(group);
            }

            group.blocks.push(block);
            return;
        }

        const blockType = getScriptBlockNodeType(block);
        const blockId = getScriptBlockId(block);

        if (blockType === 'act') {
            currentAct = blockId;
            groups.push({actBlockId: currentAct, sceneBlockId: null, blocks: [block]});
            return;
        }

        if (blockType === 'scene') {
            groups.push({actBlockId: currentAct, sceneBlockId: blockId, blocks: [block]});
            return;
        }

        const group = groups.at(-1) ?? createImplicitGroup(currentAct);

        if (!groups.includes(group)) {
            groups.push(group);
        }

        group.blocks.push(block);
    });

    return groups;
};

export const sceneMentionsCharacter = (
    group: SceneGroup,
    character: {id: string, key: string},
): boolean => group.blocks.some(block => nodeMentionsCharacter(block, character));
