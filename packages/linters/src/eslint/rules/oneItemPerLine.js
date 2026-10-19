/*
 * When a bracketed list is broken across lines, every item and the closing
 * bracket must start on their own line. Complements
 * `object-curly-newline` / `array-bracket-newline`, which only move the brackets.
 * Covers objects, arrays, destructuring, import/export specifiers and type literals.
 * Indentation of the moved items is left to `@stylistic/indent`.
 */
/*
 * Lists this long are checked whenever their brackets span lines; shorter ones
 * only once an item already starts on a new line (so `{a, b}` stays inline).
 */
const MIN_ITEMS_ALWAYS_CHECKED = 3;

const getItems = node => {
    switch (node.type) {
        case 'ObjectExpression':
        case 'ObjectPattern':
            return node.properties;
        case 'ArrayExpression':
        case 'ArrayPattern':
            return node.elements.filter(Boolean);
        case 'ImportDeclaration':
            return node.specifiers.filter(specifier => specifier.type === 'ImportSpecifier');
        case 'ExportNamedDeclaration':
            return node.declaration ? [] : node.specifiers;
        case 'TSTypeLiteral':
            return node.members;
        default:
            return [];
    }
};

const rule = {
    meta: {
        type: 'layout',
        fixable: 'whitespace',
        schema: [],
        messages: {
            itemOnOwnLine: 'Each item of a multiline list must be on its own line.',
            closingOnOwnLine: 'The closing bracket of a multiline list must be on its own line.',
        },
    },
    create(context) {
        const {sourceCode} = context;

        const check = node => {
            const items = getItems(node);

            if (items.length === 0) {
                return;
            }

            const opening = sourceCode.getTokenBefore(items[0], token => token.value === '{' || token.value === '[');
            const closing = sourceCode.getTokenAfter(items.at(-1), token => token.value === '}' || token.value === ']');

            if (!opening || !closing) {
                return;
            }

            const startsOnNewLine = item => sourceCode.getTokenBefore(item, {includeComments: true}).loc.end.line
                !== sourceCode.getFirstToken(item).loc.start.line;
            const isBroken = items.some(startsOnNewLine)
                || (items.length >= MIN_ITEMS_ALWAYS_CHECKED && opening.loc.start.line !== closing.loc.end.line);

            if (!isBroken) {
                return;
            }

            for (const item of items) {
                if (startsOnNewLine(item)) {
                    continue;
                }

                const previousToken = sourceCode.getTokenBefore(item, {includeComments: true});
                const itemStart = sourceCode.getFirstToken(item);

                context.report({
                    node: item,
                    messageId: 'itemOnOwnLine',
                    fix: fixer => fixer.replaceTextRange([previousToken.range[1], itemStart.range[0]], '\n'),
                });
            }

            const beforeClosing = sourceCode.getTokenBefore(closing, {includeComments: true});

            if (beforeClosing.loc.end.line === closing.loc.start.line) {
                context.report({
                    loc: closing.loc,
                    messageId: 'closingOnOwnLine',
                    fix: fixer => fixer.replaceTextRange([beforeClosing.range[1], closing.range[0]], '\n'),
                });
            }
        };

        return {
            ObjectExpression: check,
            ObjectPattern: check,
            ArrayExpression: check,
            ArrayPattern: check,
            ImportDeclaration: check,
            ExportNamedDeclaration: check,
            TSTypeLiteral: check,
        };
    },
};

export default rule;
