import {removeRedundantEmptyActions} from './parser/cleanupBlocks';
import {parseInlineEmphasis} from './parser/inlineEmphasis';
import {normalizeParsedLineText} from './parser/lineNormalization';
import {
    detectType,
    hasHardLineBreak,
    stripHardLineBreak,
} from './parser/typeDetection';
import {wrapDualSections} from './parser/wrapDualSections';
import {
    type FountainDocument,
    type FountainElement,
    type FountainElementType,
} from './types';

export const fountainParser = (source: string): FountainDocument => {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    let previousType: FountainElementType | null = null;
    let carryOver = false;
    const blocks: FountainElement[] = [];

    for (const rawLine of lines) {
        const hardBreak = hasHardLineBreak(rawLine);
        const line = hardBreak ? stripHardLineBreak(rawLine) : rawLine;
        const targetBlock = carryOver ? blocks[blocks.length - 1] : undefined;
        const type: FountainElementType = targetBlock
            ? targetBlock.type
            : detectType(line, previousType);
        const text = normalizeParsedLineText(type, line);

        if (!targetBlock) {
            blocks.push({
                type,
                children: parseInlineEmphasis(text),
            });
            previousType = type;

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
