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

export interface StagisticFragmentContext {
    hasActs: boolean,
    actHeadingBlockId: string | null,
    sceneHeadingBlockId: string | null,
    musicNumber: number,
    openMusicNumber: number | null,
}

export interface StagisticUnit {
    blockIds: string[],
    text: string,
    kind: 'speech' | 'block',
    contextBefore: StagisticFragmentContext,
}

const getBlockId = (node: ScriptNode): string => (typeof node.attrs?.id === 'string' ? node.attrs.id : '');

export const serializeStagisticUnits = (document: ScriptDocument): StagisticUnit[] => {
    const sections: StagisticUnit[] = [];
    const state: SerializationState = {musicNumber: 0, openMusicNumber: null};
    const hasActs = document.content.some(node => getScriptBlockNodeType(node) === 'act');
    let actHeadingBlockId: string | null = null;
    let sceneHeadingBlockId: string | null = null;

    for (let index = 0; index < document.content.length; index += 1) {
        const node = document.content[index];
        const blockType = getScriptBlockNodeType(node);
        const blockIds = [getBlockId(node)];

        if (blockType === 'act') {
            actHeadingBlockId = blockIds[0];
            sceneHeadingBlockId = null;
        }

        if (blockType === 'scene') {
            sceneHeadingBlockId = blockIds[0];
        }

        const contextBefore = {
            hasActs,
            actHeadingBlockId,
            sceneHeadingBlockId,
            ...state,
        };
        const append = (text: string) => sections.push({
            text,
            blockIds,
            kind: blockType === 'character' ? 'speech' : 'block',
            contextBefore,
        });

        if (blockType === 'act') {
            state.openMusicNumber = null;
            append(`# ${serializeInlineContent(node.content, state).text.trim()}`);
            continue;
        }

        if (blockType === 'scene') {
            state.openMusicNumber = null;
            append(`${hasActs ? '##' : '#'} ${serializeInlineContent(node.content, state).text.trim()}`);
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
                blockIds.push(getBlockId(nextNode));
                speechLines.push(serializeSpeechBlock(nextNode, state));
            }

            append(speechLines.join('\n'));
            continue;
        }

        if (blockType === 'note') {
            append(`[[ ${serializeInlineContent(node.content, state).text.trim()} ]]`);
            continue;
        }

        if (blockType === 'stageDirection') {
            const {text, hitOut} = serializeInlineContent(node.content, state);
            const serializedText = shouldForceStageDirection(text) ? `!${text}` : text;

            append(hitOut ? `${serializedText}\n\n${hitOut}` : serializedText);
            continue;
        }

        append(serializeSpeechBlock(node, state));
    }

    return sections.filter(section => section.text.length > 0);
};

export const serializeStagisticFragment = (units: readonly StagisticUnit[]) => ({
    text: units.map(unit => unit.text).join('\n\n'),
    blockIds: units.flatMap(unit => unit.blockIds),
    context: units[0]?.contextBefore ?? null,
});

export const serializeStagistic = (document: ScriptDocument, options: SerializeStagisticOptions): string => {
    const frontmatter = serializeStagisticFrontmatter(options);
    const body = serializeStagisticFragment(serializeStagisticUnits(document)).text;

    return `${frontmatter}${body ? `\n\n${body}` : ''}\n`;
};
