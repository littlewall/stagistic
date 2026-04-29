import {
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    type FountainDocument,
    type FountainElement,
    type FountainElementType,
} from '../types';
import {removeRedundantEmptyActions} from './cleanupBlocks';
import {parseInlineEmphasis} from './inlineEmphasis';
import {normalizeParsedLineText} from './lineNormalization';
import {
    detectType,
    hasHardLineBreak,
    stripHardLineBreak,
} from './typeDetection';
import {wrapDualSections} from './wrapDualSections';

export type ParseFountainOptions = {
    enableLegacyCapsLyricsHeuristic?: boolean,
};

const LEGACY_CAPS_LYRICS_CHAIN_TYPES = new Set<FountainElementType>([
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_PARENTHETICAL,
    ELEMENT_LYRICS,
]);

export const fountainParser = (
    source: string,
    options?: ParseFountainOptions,
): FountainDocument => {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    let previousType: FountainElementType | null = null;
    let carryOver = false;
    let legacyCapsLyricsMode = false;
    const blocks: FountainElement[] = [];

    for (const rawLine of lines) {
        const hardBreak = hasHardLineBreak(rawLine);
        const line = hardBreak ? stripHardLineBreak(rawLine) : rawLine;
        const targetBlock = carryOver ? blocks[blocks.length - 1] : undefined;
        const type: FountainElementType = targetBlock
            ? targetBlock.type
            : detectType(line, previousType, {
                enableLegacyCapsLyricsHeuristic: options?.enableLegacyCapsLyricsHeuristic,
                legacyCapsLyricsMode,
            });
        const text = normalizeParsedLineText(type, line);

        if (!targetBlock) {
            blocks.push({
                type,
                children: parseInlineEmphasis(text),
            });
            previousType = type;
            legacyCapsLyricsMode = line.trim().length > 0
                && LEGACY_CAPS_LYRICS_CHAIN_TYPES.has(type);

            carryOver = hardBreak;
            continue;
        }

        targetBlock.children[0].text += `\n${text}`;
        carryOver = hardBreak;
    }

    const cleaned = removeRedundantEmptyActions(blocks);

    return wrapDualSections(cleaned);
};

export const parseFountain = fountainParser;

export * from './sectionDetection';
