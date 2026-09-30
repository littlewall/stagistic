import {
    CHARACTER_TAG_MARK_NAME,
    collectMusicAtoms,
    deriveMusic,
    formatMusicNumber,
    getScriptBlockId,
    getScriptBlockNodeType,
    hasNodeChildren,
    MUSIC_ID_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
    type MusicBlockInput,
    type ScriptDocument,
    type ScriptNode,
} from '@stagistic/script';

import {
    DEFAULT_BLOCK_TYPE,
    type InlineStyle,
    type MusicLabels,
    type TextSegment,
} from './model';

const getNodeText = (node: ScriptNode): string => {
    const ownText = typeof node.text === 'string' ? node.text : '';
    const childText = hasNodeChildren(node) ? node.content.map(getNodeText).join('') : '';

    return `${ownText}${childText}`;
};

const readAttrString = (attrs: Record<string, unknown> | undefined, key: string): string => {
    const value = attrs?.[key];

    return typeof value === 'string' ? value : '';
};

/**
 * Music atoms carry no inline text: their visible label (scene-scoped number +
 * title) is derived globally, exactly as the editor's music-numbering plugin does,
 * so the transcript reserves the same vertical space the editor shows.
 */
export const buildMusicLabels = (doc: ScriptDocument): MusicLabels => {
    const inputs: MusicBlockInput[] = doc.content.map(node => ({
        blockId: getScriptBlockId(node) ?? '',
        blockType: getScriptBlockNodeType(node, DEFAULT_BLOCK_TYPE),
        musicAtoms: collectMusicAtoms(node),
    }));
    const numberByMusicId = new Map<string, string>();

    deriveMusic(inputs).forEach(music => {
        numberByMusicId.set(music.musicId, formatMusicNumber(music));
    });

    return {numberByMusicId};
};

const markStyle = (node: ScriptNode): InlineStyle => ({
    bold: node.marks?.some(mark => mark.type === 'bold') ?? false,
    italic: node.marks?.some(mark => mark.type === 'italic') ?? false,
    underline: node.marks?.some(mark => mark.type === 'underline') ?? false,
});

const hasCharacterTagMark = (node: ScriptNode): boolean => {
    return node.marks?.some(mark => mark.type === CHARACTER_TAG_MARK_NAME) ?? false;
};

export const pushSegment = (segments: TextSegment[], text: string, style: InlineStyle = {}) => {
    if (text.length === 0) {
        return;
    }

    const previous = segments[segments.length - 1];

    if (
        previous &&
        Boolean(previous.style.bold) === Boolean(style.bold) &&
        Boolean(previous.style.italic) === Boolean(style.italic) &&
        Boolean(previous.style.underline) === Boolean(style.underline) &&
        Boolean(previous.style.noUnderline) === Boolean(style.noUnderline) &&
        Boolean(previous.style.characterTag) === Boolean(style.characterTag)
    ) {
        previous.text = `${previous.text}${text}`;

        return;
    }

    segments.push({text, style});
};

export const getBlockRawSegments = (node: ScriptNode, _blockId: string, music: MusicLabels): TextSegment[] => {
    if (!hasNodeChildren(node)) {
        return [{text: getNodeText(node), style: {...markStyle(node), characterTag: hasCharacterTagMark(node)}}];
    }

    const segments: TextSegment[] = [];

    node.content.forEach(child => {
        if (child.type === MUSIC_START_NODE_NAME) {
            const number = music.numberByMusicId.get(readAttrString(child.attrs, MUSIC_ID_ATTR)) ?? '';
            const title = readAttrString(child.attrs, MUSIC_TITLE_ATTR).trim();

            pushSegment(segments, ` ${title.length > 0 ? `${number} ${title}` : number} `, {bold: true});

            return;
        }

        if (child.type === MUSIC_OUT_NODE_NAME) {
            return;
        }

        pushSegment(segments, getNodeText(child), {...markStyle(child), characterTag: hasCharacterTagMark(child)});
    });

    return segments;
};

const applyCasing = (text: string, casing: string | undefined) => {
    if (casing === 'uppercase') {
        return text.toLocaleUpperCase();
    }

    if (casing === 'lowercase') {
        return text.toLocaleLowerCase();
    }

    return text;
};

export const normalizeBlockSegments = (rawSegments: TextSegment[], blockType: string, casing: string | undefined) => {
    const segments: TextSegment[] = [];
    let pendingSpace = false;

    rawSegments.forEach(segment => {
        const isCharacterTag = blockType === 'stageDirection' && segment.style.characterTag === true;
        const casedText = isCharacterTag ? segment.text.toLocaleUpperCase() : applyCasing(segment.text, casing);

        Array.from(casedText).forEach(character => {
            if ((/\s/u).test(character)) {
                pendingSpace = segments.length > 0;

                return;
            }

            if (pendingSpace) {
                pushSegment(segments, ' ', segment.style);
                pendingSpace = false;
            }

            pushSegment(segments, character, segment.style);
        });
    });

    if (blockType === 'aside' && segments.length > 0) {
        pushSegment(segments, ')', segments.at(-1)?.style);
        segments.unshift({text: '(', style: segments[0].style});
    }

    return segments;
};
