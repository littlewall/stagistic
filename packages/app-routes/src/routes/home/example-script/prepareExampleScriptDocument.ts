import {
    buildScriptBlockIndex,
    collectScriptCharacterStats,
    MUSIC_KIND_ATTR,
    MUSIC_START_NODE_NAME,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

export interface PreparedExampleScript {
    document: ScriptDocument,
    characterKeys: readonly string[],
    scoreMusicId: string,
}

type NormalizeMusicResult = {
    node: ScriptNode,
    musicStartCount: number,
}

const normalizeMusicKindInNode = (node: ScriptNode): NormalizeMusicResult => {
    const nested = (node.content ?? []).map(normalizeMusicKindInNode);
    const musicStartCount = nested.reduce((count, result) => count + result.musicStartCount, 0);
    const nextContent = nested.map(result => result.node);
    const hasChangedContent = nextContent.some((child, index) => child !== node.content?.[index]);
    const withNestedContent = hasChangedContent ? {...node, content: nextContent} : node;

    if (node.type !== MUSIC_START_NODE_NAME) {
        return {node: withNestedContent, musicStartCount};
    }

    return {
        node: {
            ...withNestedContent,
            attrs: {
                ...withNestedContent.attrs,
                [MUSIC_KIND_ATTR]: 'song',
            },
        },
        musicStartCount: musicStartCount + 1,
    };
};

const invalidExampleScript = (message: string): never => {
    throw new Error(`Invalid example script: ${message}`);
};

export const prepareExampleScriptDocument = (
    document: ScriptDocument,
): PreparedExampleScript => {
    const normalizedNodes = document.content.map(normalizeMusicKindInNode);
    const musicStartCount = normalizedNodes.reduce((count, result) => count + result.musicStartCount, 0);

    if (musicStartCount !== 1) {
        throw new Error('Example script must contain exactly one music start.');
    }

    const normalizedDocument: ScriptDocument = {
        ...document,
        content: normalizedNodes.map(result => result.node),
    };
    const characterKeys = Array.from(
        collectScriptCharacterStats(normalizedDocument, new Set()).countsByKey.keys(),
    ).sort((left, right) => left.localeCompare(right));

    if (characterKeys.length < 2) {
        throw new Error('Example script must contain at least two characters.');
    }

    const {snapshot} = buildScriptBlockIndex(normalizedDocument);
    const acts = snapshot.blocks.filter(block => block.blockType === 'act');
    const scenesByAct = new Map(acts.map(act => [act.blockId, 0]));

    snapshot.blocks
        .filter(block => block.blockType === 'scene')
        .forEach(scene => {
            if (scene.actBlockId) {
                scenesByAct.set(scene.actBlockId, (scenesByAct.get(scene.actBlockId) ?? 0) + 1);
            }
        });

    if (acts.length !== 2 || Array.from(scenesByAct.values()).some(count => count < 2)) {
        invalidExampleScript('it must contain two acts with at least two scenes each.');
    }

    if (!snapshot.blocks.some(block => block.blockType === 'lyrics')) {
        invalidExampleScript('it must contain lyrics.');
    }

    if (!snapshot.blocks.some(block => block.blockType === 'stageDirection'
        && block.characterRefs?.length)) {
        invalidExampleScript('it must contain a character tag in a stage direction.');
    }

    if (snapshot.music.length !== 1 || snapshot.music[0]?.kind !== 'song') {
        invalidExampleScript('it must contain one song.');
    }

    if (snapshot.orphanMusicOutBlockIds.length > 0) {
        invalidExampleScript('it must not contain an orphan music out.');
    }

    return {
        document: normalizedDocument,
        characterKeys,
        scoreMusicId: snapshot.music[0].musicId,
    };
};
