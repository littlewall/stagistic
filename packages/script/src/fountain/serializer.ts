import {normalizeCharacterDelimiters} from './characterNames';
import {
    isAllCaps,
    uppercaseOutsideParentheses,
} from './sharedText';
import {
    ELEMENT_ACT,
    ELEMENT_ASIDE,
    ELEMENT_CHARACTER,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_DIALOGUE,
    ELEMENT_LYRICS,
    ELEMENT_NOTE,
    ELEMENT_STAGE_DIRECTIONS,
    type FountainDocument,
    type FountainElement,
    type FountainNode,
} from './types';

export type FountainSerializerOptions = {
    beforeNodeLines?: (args: {index: number, node: FountainElement}) => string[] | null | undefined,
};

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

const serializeLine = (
    node: FountainElement,
): string => {
    let text = serializeLeaves(node);

    if (node.type === ELEMENT_CHARACTER) {
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

    if (node.type === ELEMENT_ASIDE) {
        return `(${withLineBreaks})`;
    }

    if (node.type === ELEMENT_NOTE) {
        return `[[${withLineBreaks}]]`;
    }

    if (node.type === ELEMENT_ACT) {
        const name = withLineBreaks.trim();

        return name ? `# ${name}` : '#';
    }

    if (node.type === ELEMENT_STAGE_DIRECTIONS) {
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

export const fountainSerializer = (
    nodes: FountainDocument,
    options?: FountainSerializerOptions,
): string => {
    const outputLines: string[] = [];
    let previousNonEmptyType: FountainElement['type'] | null = null;
    const flatNodes = flattenNodes(nodes);

    const getText = (node: FountainElement) => serializeLeaves(node);
    const isEmptyAction = (node: FountainElement) => node.type === ELEMENT_STAGE_DIRECTIONS && getText(node).trim().length === 0;
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
    const pushBeforeNodeLines = (index: number, node: FountainElement) => {
        const beforeNodeLines = options?.beforeNodeLines?.({
            index,
            node,
        });

        if (!beforeNodeLines || beforeNodeLines.length === 0) {
            return;
        }

        beforeNodeLines.forEach(line => {
            pushSerialized(line);
        });
    };

    for (let i = 0; i < flatNodes.length; i += 1) {
        const node = flatNodes[i];

        if (isEmptyAction(node)) {
            const nextType = nextNonEmptyType(i + 1);

            if (
                previousNonEmptyType === ELEMENT_CHARACTER
                && (nextType === ELEMENT_ASIDE
                    || nextType === ELEMENT_DIALOGUE
                    || nextType === ELEMENT_LYRICS)
            ) {
                continue;
            }

            pushBeforeNodeLines(i, node);
            pushSerialized(serializeLine(node));
            continue;
        }

        if (node.type === ELEMENT_CHARACTER) {
            if (outputLines.length > 0 && outputLines[outputLines.length - 1] !== '') {
                outputLines.push('');
            }
        }

        pushBeforeNodeLines(i, node);
        pushSerialized(serializeLine(node));
        previousNonEmptyType = node.type;
    }

    return outputLines.join('\n');
};
