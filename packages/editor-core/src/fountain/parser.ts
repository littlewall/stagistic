import {
    type ColumnElement,
    type ColumnGroupElement,
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainDocument,
    type FountainElement,
    type FountainElementType,
    type FountainText,
} from './types';

const SCENE_HEADING_PATTERN = /^(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.)/;
const TRANSITION_PATTERN = /(TO:|FADE OUT\.|FADE TO BLACK\.)$/;
const CENTERED_PATTERN = /^>.*<$/;

const isAllCaps = (line: string) => {
    const letters = line.replace(/[^A-Za-z]/g, '');

    return letters.length > 0 && letters === letters.toUpperCase();
};

const isDualCharacterLine = (line: string) => (/\^\s*$/).test(line);
const stripCharacterExtensions = (line: string) => line.replace(/\^\s*$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
const isCharacterLine = (line: string) => {
    const stripped = stripCharacterExtensions(line);

    if (stripped.length === 0) return false;

    return isAllCaps(stripped);
};
const hasHardLineBreak = (line: string) => (/[ \t]{2}$/).test(line);
const stripHardLineBreak = (line: string) => line.replace(/[ \t]{2}$/, '');
const uppercaseOutsideParentheses = (value: string) => {
    let inside = false;
    let result = '';

    for (const char of value) {
        if (char === '(') {
            inside = true;
            result += char;
            continue;
        }

        if (char === ')') {
            inside = false;
            result += char;
            continue;
        }

        result += inside ? char : char.toUpperCase();
    }

    return result;
};

type InlineMark = {
    bold?: boolean,
    italic?: boolean,
    underline?: boolean,
};

const INLINE_RULES: Array<{
    pattern: RegExp,
    mark: InlineMark,
}> = [
    {pattern: /\*\*\*([^\n*][^*\n]*?)\*\*\*/g, mark: {bold: true, italic: true}},
    {pattern: /\*\*([^\n*][^*\n]*?)\*\*/g, mark: {bold: true}},
    {pattern: /_([^\n_][^_\n]*?)_/g, mark: {underline: true}},
    {pattern: /\*([^\n*][^*\n]*?)\*/g, mark: {italic: true}},
];

const parseInlineEmphasis = (value: string) => {
    const nodes: FountainText[] = [];
    let index = 0;

    while (index < value.length) {
        let nextMatch: {
            start: number,
            end: number,
            inner: string,
            mark: InlineMark,
        } | null = null;

        for (const rule of INLINE_RULES) {
            rule.pattern.lastIndex = index;

            const match = rule.pattern.exec(value);

            if (!match) continue;

            const start = match.index;
            const end = start + match[0].length;
            const inner = match[1] ?? '';

            if (
                nextMatch === null
                || start < nextMatch.start
                || (start === nextMatch.start && end > nextMatch.end)
            ) {
                nextMatch = {
                    start, end, inner, mark: rule.mark,
                };
            }
        }

        if (!nextMatch) {
            nodes.push({text: value.slice(index)});
            break;
        }

        if (nextMatch.start > index) {
            nodes.push({text: value.slice(index, nextMatch.start)});
        }

        if (nextMatch.inner.length > 0) {
            nodes.push({text: nextMatch.inner, ...nextMatch.mark});
        }

        index = nextMatch.end;
    }

    return nodes.length > 0 ? nodes : [{text: ''}];
};

const detectType = (
    line: string,
    previousType: FountainElementType | null,
): FountainElementType => {
    const trimmed = line.trim();

    if (trimmed.startsWith('!')) {
        return ELEMENT_ACTION;
    }

    if (trimmed.length === 0) {
        return ELEMENT_ACTION;
    }

    if (SCENE_HEADING_PATTERN.test(trimmed)) {
        return ELEMENT_SCENE_HEADING;
    }

    if (CENTERED_PATTERN.test(trimmed)) {
        return ELEMENT_CENTERED;
    }

    if (trimmed.startsWith('>')) {
        return ELEMENT_TRANSITION;
    }

    if (TRANSITION_PATTERN.test(trimmed) && isAllCaps(trimmed)) {
        return ELEMENT_TRANSITION;
    }

    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
        return ELEMENT_PARENTHETICAL;
    }

    if (trimmed.startsWith('~')) {
        return ELEMENT_LYRICS;
    }

    if (isDualCharacterLine(trimmed)) {
        return ELEMENT_DUAL_DIALOGUE_CHARACTER;
    }

    if (isCharacterLine(trimmed)) {
        return ELEMENT_CHARACTER;
    }

    if (
        previousType === ELEMENT_CHARACTER
        || previousType === ELEMENT_DUAL_DIALOGUE_CHARACTER
        || previousType === ELEMENT_PARENTHETICAL
        || previousType === ELEMENT_DIALOGUE
        || previousType === ELEMENT_DUAL_DIALOGUE
    ) {
        return ELEMENT_DIALOGUE;
    }

    return ELEMENT_ACTION;
};

export const fountainParser = (source: string): FountainDocument => {
    // Phase 1: structure only. Each line becomes one block.
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    let previousType: FountainElementType | null = null;
    let carryOver = false;
    const blocks: FountainDocument = [];

    for (const rawLine of lines) {
        const hardBreak = hasHardLineBreak(rawLine);
        const line = hardBreak ? stripHardLineBreak(rawLine) : rawLine;
        const targetBlock = carryOver ? blocks[blocks.length - 1] : null;
        const type = targetBlock ? targetBlock.type : detectType(line, previousType);
        let text =
            type === ELEMENT_LYRICS ? line.trim().replace(/^~\s?/, '') : line;

        if (type === ELEMENT_ACTION) {
            text = text.replace(/^\s*!\s*/, '');
        }

        if (type === ELEMENT_PARENTHETICAL) {
            text = text.trim().replace(/^\(/, '').replace(/\)$/, '')
                .trim();
        }

        if (type === ELEMENT_CENTERED) {
            text = text.trim().replace(/^>/, '').replace(/<$/, '')
                .trim();
        }

        if (type === ELEMENT_DUAL_DIALOGUE_CHARACTER) {
            text = text.trim().replace(/\^\s*$/, '').trim();
            text = uppercaseOutsideParentheses(text);
        }

        if (type === ELEMENT_CHARACTER) {
            text = uppercaseOutsideParentheses(text);
        }

        if (type === ELEMENT_TRANSITION) {
            text = text.trim().replace(/^>\s*/, '').trim()
                .toUpperCase();
        }

        if (targetBlock) {
            targetBlock.children[0].text += `\n${text}`;
        } else {
            blocks.push({
                type,
                children: parseInlineEmphasis(text),
            });
            previousType = type;
        }

        carryOver = hardBreak;
    }

    const isEmptyAction = (block: FountainDocument[number]) => block.type === ELEMENT_ACTION
        && 'children' in block
        && Array.isArray(block.children)
        && typeof block.children[0] === 'object'
        && 'text' in block.children[0]
        && block.children[0].text.trim().length === 0;

    const cleaned: FountainDocument = [];
    let previousNonEmptyType: FountainElementType | null = null;

    for (let i = 0; i < blocks.length; i += 1) {
        const block = blocks[i];

        if (isEmptyAction(block)) {
            let nextNonEmptyType: FountainElementType | null = null;

            for (let j = i + 1; j < blocks.length; j += 1) {
                if (!isEmptyAction(blocks[j])) {
                    nextNonEmptyType = blocks[j].type;
                    break;
                }
            }

            if (nextNonEmptyType === ELEMENT_CHARACTER) {
                continue;
            }

            if (
                previousNonEmptyType === ELEMENT_TRANSITION
                || nextNonEmptyType === ELEMENT_TRANSITION
            ) {
                continue;
            }
        }

        cleaned.push(block);
        if (!isEmptyAction(block)) {
            previousNonEmptyType = block.type;
        }
    }

    const isDialogueSectionType = (type: FountainElementType) => type === ELEMENT_CHARACTER
        || type === ELEMENT_DUAL_DIALOGUE_CHARACTER
        || type === ELEMENT_DIALOGUE
        || type === ELEMENT_DUAL_DIALOGUE
        || type === ELEMENT_PARENTHETICAL;

    const wrapDualSections = (blocksToWrap: FountainElement[]) => {
        const wrapped: FountainDocument = [];
        let index = 0;

        const nextNonEmptyType = (start: number) => {
            for (let i = start; i < blocksToWrap.length; i += 1) {
                if (!isEmptyAction(blocksToWrap[i])) {
                    return blocksToWrap[i].type;
                }
            }

            return null;
        };

        while (index < blocksToWrap.length) {
            const block = blocksToWrap[index];

            if (!isDialogueSectionType(block.type)) {
                wrapped.push(block);
                index += 1;
                continue;
            }

            const section: FountainElement[] = [];
            let cursor = index;

            while (cursor < blocksToWrap.length) {
                const current = blocksToWrap[cursor];

                if (isDialogueSectionType(current.type)) {
                    section.push(current);
                    cursor += 1;
                    continue;
                }

                if (isEmptyAction(current)) {
                    const nextType = nextNonEmptyType(cursor + 1);

                    if (nextType && isDialogueSectionType(nextType)) {
                        section.push(current);
                        cursor += 1;
                        continue;
                    }
                }

                break;
            }

            const hasDual = section.some(
                node => node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER
                    || node.type === ELEMENT_DUAL_DIALOGUE,
            );

            if (!hasDual) {
                wrapped.push(...section);
                index = cursor;
                continue;
            }

            const left: FountainElement[] = [];
            const right: FountainElement[] = [];
            let currentColumn: 'left' | 'right' = 'left';

            for (const node of section) {
                if (isEmptyAction(node)) {
                    continue;
                }

                if (node.type === ELEMENT_CHARACTER) {
                    currentColumn = 'left';
                    left.push(node);
                    continue;
                }

                if (
                    node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER
                    || node.type === ELEMENT_DUAL_DIALOGUE
                ) {
                    currentColumn = 'right';
                    right.push(node);
                    continue;
                }

                if (node.type === ELEMENT_DIALOGUE || node.type === ELEMENT_PARENTHETICAL) {
                    if (currentColumn === 'left') {
                        left.push(node);
                    } else {
                        right.push(node);
                    }

                    continue;
                }

                left.push(node);
            }

            const columnGroup: ColumnGroupElement = {
                type: ELEMENT_COLUMN_GROUP,
                children: [
                    {
                        type: ELEMENT_COLUMN,
                        width: '50%',
                        children: left,
                    } as ColumnElement, {
                        type: ELEMENT_COLUMN,
                        width: '50%',
                        children: right,
                    } as ColumnElement,
                ],
            };

            wrapped.push(columnGroup);
            index = cursor;
        }

        return wrapped;
    };

    const flatBlocks = cleaned.filter(
        (node): node is FountainElement => node.type !== ELEMENT_COLUMN_GROUP && node.type !== ELEMENT_COLUMN,
    );

    return wrapDualSections(flatBlocks);
};

export const parseFountain = fountainParser;
