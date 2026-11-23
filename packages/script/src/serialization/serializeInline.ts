import {CHARACTER_TAG_MARK_NAME} from '../characters';
import {type ScriptNode} from '../document';
import {
    MUSIC_KIND_ATTR,
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
    return force || (/[\s.@/:"\\]/u).test(value) ? quoteLiteral(value) : value;
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

const escapeInlineText = (value: string) => value.replace(/[\\*_@]/gu, '\\$&');

const hasEmphasis = (node: ScriptNode) => (node.marks ?? []).some(mark => [
    'bold',
    'italic',
    'underline',
].includes(mark.type));

// 'bareSpaced': only whitespace was written since a bare out, so only a digit is still ambiguous.
type AfterOut = 'bare' | 'bareSpaced' | 'numbered' | null;

const serializeTextNode = (node: ScriptNode, afterOut: AfterOut = null) => {
    const text = (node.text ?? '').replace(/\u200b/gu, '');

    if (!text) {
        return '';
    }

    if (hasCharacterTag(node)) {
        return serializeTag(text, node, undefined);
    }

    const escaped = escapeInlineText(text);

    /*
     * A digit that would read as the number of the `@@out` before it, or a letter/digit that would
     * extend the marker (`@@outro`), is escaped.
     */
    const unambiguous = afterOut === 'bare'
        ? escaped.replace(/^(\s+)(\d)/u, '$1\\$2').replace(/^([\p{L}\p{N}])/u, '\\$1')
        : afterOut === 'numbered' ? escaped.replace(/^([\p{L}\p{N}])/u, '\\$1')
            : afterOut === 'bareSpaced' ? escaped.replace(/^(\d)/u, '\\$1') : escaped;

    return applyEmphasisMarks(hasEmphasis(node) ? escaped : unambiguous, node);
};

/* Quoted when text follows directly, or emphasis markers would otherwise end up in the name. */
const serializeTag = (name: string, node: ScriptNode, next: ScriptNode | undefined) => {
    const nextText = next?.text ?? '';
    const mustSeparateFollowingText = nextText.length > 0 && !(/^\s/u).test(nextText);

    return applyEmphasisMarks(`@${quoteNameWhenRequired(name, mustSeparateFollowingText || hasEmphasis(node))}`, node);
};

const characterTagContinues = (node: ScriptNode | undefined, identity: string) => {
    return node !== undefined && typeof node.text === 'string' && getCharacterTagIdentity(node) === identity;
};

const serializeMusicStart = (node: ScriptNode, state: SerializationState, previousHit: string | null) => {
    state.musicNumber += 1;

    const number = state.musicNumber;
    const title = typeof node.attrs?.[MUSIC_TITLE_ATTR] === 'string' ? node.attrs[MUSIC_TITLE_ATTR] : '';
    const kind = node.attrs?.[MUSIC_KIND_ATTR];
    const kindWord = typeof kind === 'string' && (/^[A-Za-z][\w-]*$/u).test(kind) ? `${kind} ` : '';
    const marker = `@@music ${number} ${kindWord}${quoteLiteral(title)}`;

    if (node.attrs?.[MUSIC_MODE_ATTR] === 'hit') {
        return {marker, hitOut: `@@out ${number}`};
    }

    state.openMusicNumber = number;

    return {marker, hitOut: previousHit};
};

/*
 * Text is written verbatim around music markers: a marker follows its text directly, and two
 * markers with nothing between them are separated by one space (the parser drops that space). Text
 * made only of whitespace between two markers has its first character escaped to survive that rule.
 */
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
    let lastAtomEnd = -1;
    let afterOut: AfterOut = null;
    const outMarkers: string[] = [];

    const content = nodes ?? [];
    const appendAtom = (marker: string) => {
        const between = lastAtomEnd >= 0 ? text.slice(lastAtomEnd) : null;

        if (between === '') {
            text += ' ';
        } else if (between !== null && between.trim() === '') {
            text = `${text.slice(0, lastAtomEnd)}\\${between}`;
        }

        text += marker;
        lastAtomEnd = text.length;
    };

    for (let index = 0; index < content.length; index += 1) {
        const node = content[index];

        if (node.type === MUSIC_START_NODE_NAME) {
            const {marker, hitOut: nextHit} = serializeMusicStart(node, state, hitOut);

            appendAtom(marker);
            hitOut = nextHit;
            afterOut = null;

            continue;
        }

        if (node.type === MUSIC_OUT_NODE_NAME) {
            const marker = state.openMusicNumber !== null ? `@@out ${state.openMusicNumber}` : '@@out';

            if (options.includeOut !== false) {
                appendAtom(marker);
                afterOut = state.openMusicNumber === null ? 'bare' : 'numbered';
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
                    characterTagContinues(content[index + 1], tagIdentity)
                ) {
                    index += 1;
                    taggedText += content[index].text;
                }

                taggedText = taggedText.replace(/\u200b/gu, '');

                if (!taggedText) {
                    continue;
                }

                text += serializeTag(taggedText, node, content[index + 1]);
                afterOut = null;
                continue;
            }

            text += serializeTextNode(node, afterOut);

            const written = node.text.replace(/\u200b/gu, '');

            if (written !== '' && afterOut !== null) {
                afterOut = afterOut !== 'numbered' && written.trim() === '' ? 'bareSpaced' : null;
            }

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
