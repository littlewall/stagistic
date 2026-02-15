import {normalizeCharacterDelimiters} from './characterNames';
import {
    isAllCaps,
    uppercaseOutsideParentheses,
} from './sharedText';
import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_TRANSITION,
    type FountainDocument,
    type FountainElement,
    type FountainNode,
} from './types';

const serializeLeaves = (node: FountainElement): string => node.children
    .map(child => {
        if (!child.text) {
            return '';
        }

        let value = child.text;

        if (child.underline) {
            value = `_${value}_`;
        }

        if (child.bold && child.italic) {
            value = `***${value}***`;

            return value;
        }

        if (child.bold) {
            value = `**${value}**`;

            return value;
        }

        if (child.italic) {
            value = `*${value}*`;
        }

        return value;
    })
    .join('');

const serializeLine = (node: FountainElement): string => {
    let text = serializeLeaves(node);

    if (
        node.type === ELEMENT_CHARACTER
        || node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER
    ) {
        text = uppercaseOutsideParentheses(text);
        text = normalizeCharacterDelimiters(text);
    }

    const lines = text.split('\n');

    if (node.type === ELEMENT_LYRICS) {
        return lines
            .map((line, index) => `${index === 0 ? '~' : ''}${line}${index < lines.length - 1 ? '  ' : ''}`)
            .join('\n');
    }

    const withLineBreaks = lines
        .map((line, index) => `${line}${index < lines.length - 1 ? '  ' : ''}`)
        .join('\n');

    if (node.type === ELEMENT_CENTERED) {
        return `>${withLineBreaks}<`;
    }

    if (node.type === ELEMENT_PARENTHETICAL) {
        return `(${withLineBreaks})`;
    }

    if (node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER) {
        return `${withLineBreaks}^`;
    }

    if (node.type === ELEMENT_TRANSITION) {
        const upper = withLineBreaks.toUpperCase();

        return upper.endsWith('TO:') ? upper : `>${upper}`;
    }

    if (node.type === ELEMENT_ACTION) {
        return isAllCaps(withLineBreaks.trim())
            ? `!${withLineBreaks}`
            : withLineBreaks;
    }

    return withLineBreaks;
};

const flattenNodes = (nodes: FountainDocument): FountainElement[] => {
    const flattened: FountainElement[] = [];

    const walk = (nodeList: FountainNode[]) => {
        for (const node of nodeList) {
            if (node.type === ELEMENT_COLUMN_GROUP) {
                const group = node;
                const columns = group.children ?? [];

                if (columns[0]) {
                    walk(columns[0].children);
                }

                if (columns[1]) {
                    walk(columns[1].children);
                }

                continue;
            }

            if (node.type === ELEMENT_COLUMN) {
                const column = node;

                walk(column.children ?? []);
                continue;
            }

            flattened.push(node);
        }
    };

    walk(nodes);

    return flattened;
};

export const fountainSerializer = (nodes: FountainDocument): string => {
    const outputLines: string[] = [];
    let previousNonEmptyType: FountainElement['type'] | null = null;
    const flatNodes = flattenNodes(nodes);

    const getText = (node: FountainElement) => serializeLeaves(node);
    const isEmptyAction = (node: FountainElement) => node.type === ELEMENT_ACTION && getText(node).trim().length === 0;
    const nextNonEmptyType = (startIndex: number) => {
        for (let i = startIndex; i < flatNodes.length; i += 1) {
            if (!isEmptyAction(flatNodes[i])) {
                return flatNodes[i].type;
            }
        }

        return null;
    };
    const pushSerialized = (value: string) => {
        outputLines.push(...value.split('\n'));
    };

    for (let i = 0; i < flatNodes.length; i += 1) {
        const node = flatNodes[i];

        if (isEmptyAction(node)) {
            const nextType = nextNonEmptyType(i + 1);

            if (
                previousNonEmptyType === ELEMENT_CHARACTER
                && (nextType === ELEMENT_PARENTHETICAL
                    || nextType === ELEMENT_DIALOGUE
                    || nextType === ELEMENT_LYRICS)
            ) {
                continue;
            }

            if (
                previousNonEmptyType === ELEMENT_TRANSITION
                || nextType === ELEMENT_TRANSITION
            ) {
                continue;
            }

            pushSerialized(serializeLine(node));
            continue;
        }

        if (
            node.type === ELEMENT_CHARACTER
            || node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER
        ) {
            if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
                outputLines.push('');
            }
        }

        if (node.type === ELEMENT_TRANSITION) {
            if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
                outputLines.push('');
            }
        }

        pushSerialized(serializeLine(node));
        previousNonEmptyType = node.type;

        if (node.type === ELEMENT_TRANSITION) {
            outputLines.push('');
        }
    }

    return outputLines.join('\n');
};

export const serializeFountain = fountainSerializer;
