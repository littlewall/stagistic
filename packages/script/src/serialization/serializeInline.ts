import {CHARACTER_TAG_MARK_NAME} from '../characters';
import {type ScriptNode} from '../document';
import {
    MUSIC_MODE_ATTR,
    MUSIC_OUT_NODE_NAME,
    MUSIC_START_NODE_NAME,
    MUSIC_TITLE_ATTR,
} from '../music';
import type {SerializationState} from './serializeStagistic';

export const getText = (node: ScriptNode): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    return (node.content ?? []).map(getText).join('');
};

const escapeQuotedLiteral = (value: string) => value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"');

const quoteLiteral = (value: string) => `"${escapeQuotedLiteral(value)}"`;

export const quoteNameWhenRequired = (value: string, force = false) => {
    return force || (/[\s.@/"\\]/u).test(value) ? quoteLiteral(value) : value;
};

const applyEmphasisMarks = (value: string, node: ScriptNode) => {
    const markTypes = new Set((node.marks ?? []).map(mark => mark.type));
    let result = value;

    if (markTypes.has('underline')) {
        result = `_${result}_`;
    }

    if (markTypes.has('italic')) {
        result = `*${result}*`;
    }

    if (markTypes.has('bold')) {
        result = `**${result}**`;
    }

    return result;
};

const hasCharacterTag = (node: ScriptNode) => {
    return node.marks?.some(mark => mark.type === CHARACTER_TAG_MARK_NAME) ?? false;
};

const getCharacterTagIdentity = (node: ScriptNode) => {
    const mark = node.marks?.find(candidate => candidate.type === CHARACTER_TAG_MARK_NAME);

    if (!mark) {
        return null;
    }

    return JSON.stringify(mark.attrs ?? {});
};

const serializeTextNode = (node: ScriptNode) => {
    const text = (node.text ?? '').replace(/\u200b/gu, '');

    if (!text) {
        return '';
    }

    const value = hasCharacterTag(node) ? `@${quoteNameWhenRequired(text)}` : text;

    return applyEmphasisMarks(value, node);
};

export const serializeInlineContent = (
    nodes: ScriptNode[] | undefined,
    state: SerializationState,
    options: {includeOut?: boolean} = {},
): {
    text: string,
    hitOut: string | null,
    outMarkers: string[],
} => {
    let text = '';
    let hitOut: string | null = null;
    const outMarkers: string[] = [];

    const content = nodes ?? [];

    for (let index = 0; index < content.length; index += 1) {
        const node = content[index];

        if (node.type === MUSIC_START_NODE_NAME) {
            state.musicNumber += 1;

            const number = state.musicNumber;
            const title = typeof node.attrs?.[MUSIC_TITLE_ATTR] === 'string' ? node.attrs[MUSIC_TITLE_ATTR] : '';
            const marker = `@@music ${number} ${quoteLiteral(title)}`;

            text = text.trimEnd() ? `${text.trimEnd()} ${marker}` : marker;

            if (node.attrs?.[MUSIC_MODE_ATTR] === 'hit') {
                hitOut = `@@out ${number}`;
            } else {
                state.openMusicNumber = number;
            }

            continue;
        }

        if (node.type === MUSIC_OUT_NODE_NAME) {
            const marker = state.openMusicNumber !== null ? `@@out ${state.openMusicNumber}` : '@@out';

            if (options.includeOut !== false) {
                text = text.trimEnd() ? `${text.trimEnd()} ${marker}` : marker;
            } else {
                outMarkers.push(marker);
            }

            state.openMusicNumber = null;

            continue;
        }

        if (typeof node.text === 'string') {
            const tagIdentity = getCharacterTagIdentity(node);

            if (tagIdentity !== null) {
                let taggedText = node.text;

                while (
                    index + 1 < content.length &&
                    typeof content[index + 1].text === 'string' &&
                    getCharacterTagIdentity(content[index + 1]) === tagIdentity
                ) {
                    index += 1;
                    taggedText += content[index].text;
                }

                taggedText = taggedText.replace(/\u200b/gu, '');

                if (!taggedText) {
                    continue;
                }

                const nextText = content[index + 1]?.text ?? '';
                const mustSeparateFollowingText = nextText.length > 0 && !(/^\s/u).test(nextText);

                text += applyEmphasisMarks(`@${quoteNameWhenRequired(taggedText, mustSeparateFollowingText)}`, node);
                continue;
            }

            text += serializeTextNode(node);

            continue;
        }

        if (node.type === 'hardBreak') {
            text += '\n';

            continue;
        }

        text += serializeInlineContent(node.content, state, options).text;
    }

    return {
        text,
        hitOut,
        outMarkers,
    };
};
