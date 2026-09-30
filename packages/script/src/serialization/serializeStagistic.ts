import {
    getScriptBlockNodeType,
    type ScriptDocument,
    type ScriptNode,
} from '../document';
import {
    isQuotedCharacterCueLine,
    isUppercaseSyntaxLine,
    shouldForceStageDirection,
    splitCharacterTokens,
} from '../syntax';
import type {TitlePageSettings} from '../titlePage';
import {serializeStagisticFrontmatter} from './frontmatter';
import {
    getText,
    quoteNameWhenRequired,
    serializeInlineContent,
} from './serializeInline';

export interface SerializeStagisticOptions {
    scriptTitle: string,
    titlePage?: TitlePageSettings,
    exportDate?: Date,
}

export type SerializationState = {
    musicNumber: number,
    openMusicNumber: number | null,
};

const serializeCharacterCue = (node: ScriptNode) => {
    const cue = splitCharacterTokens(getText(node))
        .map(token => token.value.trim())
        .filter(Boolean)
        .map(name => quoteNameWhenRequired(name))
        .join(' / ');

    return isUppercaseSyntaxLine(cue) || isQuotedCharacterCueLine(cue) ? cue : `@${cue}`;
};

const serializeSpeechBlock = (node: ScriptNode, state: SerializationState) => {
    const blockType = getScriptBlockNodeType(node);
    const {
        text,
        hitOut,
        outMarkers,
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

    return outMarkers.length > 0 ? `${serialized}\n${outMarkers.map(marker => `!${marker}`).join('\n')}` : serialized;
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
                const continuesSpeech =
                    SPEECH_CONTINUATION_TYPES.includes(nextType) ||
                    (nextType === 'stageDirection' && stageDirectionRunContinuesSpeech(document.content, index + 1));

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

export const serializeStagistic = (document: ScriptDocument, options: SerializeStagisticOptions): string => {
    const frontmatter = serializeStagisticFrontmatter(options);
    const body = serializeBody(document);

    return `${frontmatter}${body ? `\n\n${body}` : ''}\n`;
};
