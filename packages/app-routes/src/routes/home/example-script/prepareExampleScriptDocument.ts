import {
    buildScriptBlockIndex,
    collectScriptCharacterStats,
    COMMENT_ANCHOR_MARK_NAME,
    COMMENT_THREAD_ID_ATTR,
    MUSIC_KIND_ATTR,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

import {
    EXAMPLE_CHARACTERS,
    EXAMPLE_COMMENT_THREADS,
    EXAMPLE_GROUPS,
    EXAMPLE_LOCATIONS,
    EXAMPLE_MUSIC_KINDS,
    EXAMPLE_SCORED_MUSIC_TITLE,
} from './exampleScriptMetadata';

export interface PreparedExampleScript {
    document: ScriptDocument;
    characterKeys: readonly string[];
    groupKeys: readonly string[];
    scoreMusicId: string;
    sceneBlockIdsByTitle: ReadonlyMap<string, string>;
}

const invalidExampleScript = (message: string): never => {
    throw new Error(`Invalid example script: ${message}`);
};

const normalizeMusicKindInNode = (node: ScriptNode): ScriptNode => {
    const content = node.content?.map(normalizeMusicKindInNode);
    const withContent = content ? {...node, content} : node;

    if (node.type !== MUSIC_START_NODE_NAME) {
        return withContent;
    }

    const rawTitle = node.attrs?.[MUSIC_TITLE_ATTR];
    const title = typeof rawTitle === 'string' ? rawTitle : '';
    const kind = EXAMPLE_MUSIC_KINDS[title] ?? invalidExampleScript(`music "${title}" has no kind.`);

    return {
        ...withContent,
        attrs: {...withContent.attrs, [MUSIC_KIND_ATTR]: kind},
    };
};

const sameKeys = (left: Iterable<string>, right: Iterable<string>) => {
    return [...left].sort().join('\n') === [...right].sort().join('\n');
};

export const prepareExampleScriptDocument = (document: ScriptDocument): PreparedExampleScript => {
    const normalizedDocument: ScriptDocument = {
        ...document,
        content: document.content.map(normalizeMusicKindInNode),
    };
    const cueKeys = collectScriptCharacterStats(normalizedDocument, new Set()).countsByKey.keys();
    const characterKeys = EXAMPLE_CHARACTERS.map(character => character.key).sort();
    const groupKeys = EXAMPLE_GROUPS.map(group => group.key).sort();

    if (!sameKeys(cueKeys, [...characterKeys, ...groupKeys])) {
        invalidExampleScript('cues must match the example characters and groups.');
    }

    const {snapshot} = buildScriptBlockIndex(normalizedDocument);
    const acts = snapshot.blocks.filter(block => block.blockType === 'act');
    const scenes = snapshot.blocks.filter(block => block.blockType === 'scene');
    const scenesByAct = new Map(acts.map(act => [act.blockId, 0]));

    scenes.forEach(scene => {
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

    if (!snapshot.blocks.some(block => block.blockType === 'note')) {
        invalidExampleScript('it must contain a note.');
    }

    if (!snapshot.blocks.some(block => block.blockType === 'stageDirection' && block.characterRefs?.length)) {
        invalidExampleScript('it must contain a character tag in a stage direction.');
    }

    if (
        !sameKeys(
            snapshot.music.map(music => music.title),
            Object.keys(EXAMPLE_MUSIC_KINDS),
        )
    ) {
        invalidExampleScript('music cues must match the example music kinds.');
    }

    if (!snapshot.music.some(music => music.mode === 'hit')) {
        invalidExampleScript('it must contain a hit.');
    }

    if (snapshot.orphanMusicOutBlockIds.length > 0) {
        invalidExampleScript('it must not contain an orphan music out.');
    }

    const scoreMusicId =
        snapshot.music.find(music => music.title === EXAMPLE_SCORED_MUSIC_TITLE)?.musicId ?? invalidExampleScript('the scored song is missing.');
    const sceneBlockIdsByTitle = new Map(scenes.map(scene => [scene.textContent, scene.blockId]));

    EXAMPLE_LOCATIONS.flatMap(location => location.sceneTitles).forEach(title => {
        if (!sceneBlockIdsByTitle.has(title)) {
            invalidExampleScript(`scene "${title}" is missing.`);
        }
    });

    EXAMPLE_COMMENT_THREADS.forEach(({blockText, quote}) => {
        if (!snapshot.blocks.some(block => block.textContent === blockText)) {
            invalidExampleScript(`comment block "${blockText}" is missing.`);
        }

        if (quote && !blockText.includes(quote)) {
            invalidExampleScript(`comment quote "${quote}" is not in its block.`);
        }
    });

    return {
        document: normalizedDocument,
        characterKeys,
        groupKeys,
        scoreMusicId,
        sceneBlockIdsByTitle,
    };
};

const markTextRange = (content: ScriptNode[], from: number, to: number, mark: NonNullable<ScriptNode['marks']>[number]) => {
    let offset = 0;

    return content.flatMap(child => {
        if (typeof child.text !== 'string') {
            return [child];
        }

        const start = offset;
        const end = offset + child.text.length;

        offset = end;

        if (end <= from || start >= to) {
            return [child];
        }

        const cutFrom = Math.max(from, start) - start;
        const cutTo = Math.min(to, end) - start;
        const pieces = [
            {...child, text: child.text.slice(0, cutFrom)},
            {...child, text: child.text.slice(cutFrom, cutTo), marks: [...(child.marks ?? []), mark]},
            {...child, text: child.text.slice(cutTo)},
        ];

        return pieces.filter(piece => piece.text);
    });
};

/*
 * Anchors a comment thread to the first block with the given text. Range
 * comments get a commentAnchor mark; block comments only need the block id.
 */
export const anchorExampleComment = (
    document: ScriptDocument,
    thread: {id: string; blockText: string; quote?: string},
): {document: ScriptDocument; blockId: string} => {
    const blockIndex = document.content.findIndex(node => {
        return (node.content ?? []).map(child => child.text ?? '').join('') === thread.blockText;
    });
    const block = document.content[blockIndex] ?? invalidExampleScript(`comment block "${thread.blockText}" is missing.`);
    const blockId = typeof block.attrs?.id === 'string' ? block.attrs.id : '';

    if (!thread.quote) {
        return {document, blockId};
    }

    const from = thread.blockText.indexOf(thread.quote);
    const content = markTextRange(block.content ?? [], from, from + thread.quote.length, {
        type: COMMENT_ANCHOR_MARK_NAME,
        attrs: {[COMMENT_THREAD_ID_ATTR]: thread.id},
    });

    return {
        document: {
            ...document,
            content: document.content.map((node, index) => (index === blockIndex ? {...node, content} : node)),
        },
        blockId,
    };
};
