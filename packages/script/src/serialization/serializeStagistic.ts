import {CHARACTER_TAG_MARK_NAME} from '../characters';
import {
    getScriptBlockNodeType, type ScriptDocument, type ScriptNode,
} from '../document';
import {
    MUSIC_MODE_ATTR, MUSIC_OUT_NODE_NAME, MUSIC_START_NODE_NAME, MUSIC_TITLE_ATTR,
} from '../music';
import {
    isQuotedCharacterCueLine,
    isUppercaseSyntaxLine,
    shouldForceStageDirection,
    splitCharacterTokens,
} from '../syntax';
import type {TitlePageSettings} from '../titlePage';
import {serializeStagisticFrontmatter} from './frontmatter';

export interface SerializeStagisticOptions {
    scriptTitle: string,
    titlePage?: TitlePageSettings,
    exportDate?: Date,
}

type SerializationState = {
    musicNumber: number,
    openMusicNumber: number | null,
};

const getText = (node: ScriptNode): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    return (node.content ?? []).map(getText).join('');
};

const escapeQuotedLiteral = (value: string) => value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"');

const quoteLiteral = (value: string) => `"${escapeQuotedLiteral(value)}"`;

const quoteNameWhenRequired = (value: string, force = false) => {
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

const serializeInlineContent = (
    nodes: ScriptNode[] | undefined,
    state: SerializationState,
    options: {includeOut?: boolean} = {},
): {
    text: string, hitOut: string | null, outMarkers: string[],
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
            const title =
                typeof node.attrs?.[MUSIC_TITLE_ATTR] === 'string' ? node.attrs[MUSIC_TITLE_ATTR] : '';
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
            const marker = state.openMusicNumber !== null
                ? `@@out ${state.openMusicNumber}`
                : '@@out';

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

                text += applyEmphasisMarks(
                    `@${quoteNameWhenRequired(taggedText, mustSeparateFollowingText)}`,
                    node,
                );
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
        text, hitOut, outMarkers,
    };
};

const serializeCharacterCue = (node: ScriptNode) => {
    const cue = splitCharacterTokens(getText(node))
        .map(token => token.value.trim())
        .filter(Boolean)
        .map(name => quoteNameWhenRequired(name))
        .join(' / ');

    return isUppercaseSyntaxLine(cue) || isQuotedCharacterCueLine(cue)
        ? cue
        : `@${cue}`;
};

const serializeSpeechBlock = (node: ScriptNode, state: SerializationState) => {
    const blockType = getScriptBlockNodeType(node);
    const {
        text, hitOut, outMarkers,
    } = serializeInlineContent(node.content, state, {includeOut: false});
    let serialized: string;

    if ((blockType === 'dialogue' || blockType === 'lyrics') && text.length === 0) {
        serialized = '~';
    } else if (blockType === 'stageDirection') {
        serialized = hitOut ? `!${text} ${hitOut}` : `!${text}`;
    } else if (blockType === 'aside') {
        const trimmed = text.trim();

        serialized = trimmed.startsWith('(') && trimmed.endsWith(')') ? trimmed : `(${trimmed})`;
    } else if (blockType === 'lyrics') {
        const match = (/^(\t*)(.*)$/su).exec(text);

        serialized = `${match?.[1] ?? ''}${(match?.[2] ?? '').toUpperCase()}`;
    } else {
        serialized = text;
    }

    return outMarkers.length > 0
        ? `${serialized}\n${outMarkers.map(marker => `!${marker}`).join('\n')}`
        : serialized;
};

const SPEECH_CONTINUATION_TYPES = [
    'aside',
    'dialogue',
    'lyrics',
];

const stageDirectionRunContinuesSpeech = (content: ScriptNode[], fromIndex: number): boolean => {
    let index = fromIndex;

    while (index < content.length && getScriptBlockNodeType(content[index]) === 'stageDirection') {
        index += 1;
    }

    return index < content.length && SPEECH_CONTINUATION_TYPES.includes(getScriptBlockNodeType(content[index]));
};

const serializeBody = (document: ScriptDocument) => {
    const sections: string[] = [];
    const state: SerializationState = {musicNumber: 0, openMusicNumber: null};
    const hasActs = document.content.some(node => getScriptBlockNodeType(node) === 'act');

    for (let index = 0; index < document.content.length; index += 1) {
        const node = document.content[index];
        const blockType = getScriptBlockNodeType(node);

        if (blockType === 'act') {
            state.openMusicNumber = null;
            sections.push(`# ${serializeInlineContent(node.content, state).text.trim()}`);
            continue;
        }

        if (blockType === 'scene') {
            state.openMusicNumber = null;
            sections.push(`${hasActs ? '##' : '#'} ${serializeInlineContent(node.content, state).text.trim()}`);
            continue;
        }

        if (blockType === 'character') {
            const speechLines = [serializeCharacterCue(node)];

            while (index + 1 < document.content.length) {
                const nextNode = document.content[index + 1];
                const nextType = getScriptBlockNodeType(nextNode);
                const continuesSpeech = SPEECH_CONTINUATION_TYPES.includes(nextType)
                    || (nextType === 'stageDirection' && stageDirectionRunContinuesSpeech(document.content, index + 1));

                if (!continuesSpeech) {
                    break;
                }

                index += 1;
                speechLines.push(serializeSpeechBlock(nextNode, state));
            }

            sections.push(speechLines.join('\n'));
            continue;
        }

        if (blockType === 'note') {
            sections.push(`[[ ${serializeInlineContent(node.content, state).text.trim()} ]]`);
            continue;
        }

        if (blockType === 'stageDirection') {
            const {text, hitOut} = serializeInlineContent(node.content, state);
            const serializedText = shouldForceStageDirection(text) ? `!${text}` : text;

            sections.push(hitOut ? `${serializedText}\n\n${hitOut}` : serializedText);
            continue;
        }

        sections.push(serializeSpeechBlock(node, state));
    }

    return sections.filter(section => section.length > 0).join('\n\n');
};

export const serializeStagistic = (
    document: ScriptDocument,
    options: SerializeStagisticOptions,
): string => {
    const frontmatter = serializeStagisticFrontmatter(options);
    const body = serializeBody(document);

    return `${frontmatter}${body ? `\n\n${body}` : ''}\n`;
};
