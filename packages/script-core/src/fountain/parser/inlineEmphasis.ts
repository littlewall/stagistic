import type {FountainText} from '../types';

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

export const parseInlineEmphasis = (value: string): FountainText[] => {
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

            if (!match) {
                continue;
            }

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
