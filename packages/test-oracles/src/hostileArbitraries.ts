import * as fc from 'fast-check';

/*
 * Hostile input generators for parsers and decoders: they assert only that a controlled
 * result comes back (`ok: false`, issues, a parse error), never an unexpected exception.
 */

/* Fragments of every syntax the `.stagistic` parser reacts to. */
export const STAGISTIC_SYNTAX_FRAGMENTS = [
    '---',
    '# ',
    '## ',
    '!',
    '~',
    '[[',
    ']]',
    '(',
    ')',
    '"',
    '@',
    '@@music 1 "x"',
    '@@out',
    '@@out 1',
    '**',
    '*',
    '_',
    ':',
    '/',
    'title: "x"',
    'draftDate: 2026-01-01',
    'credits:',
] as const;

const arbitraryHostileLine = fc.oneof(
    {arbitrary: fc.string({unit: 'grapheme', maxLength: 30}), weight: 3},
    {arbitrary: fc.constantFrom(...STAGISTIC_SYNTAX_FRAGMENTS), weight: 2},
    {
        arbitrary: fc
            .array(fc.oneof(fc.constantFrom(...STAGISTIC_SYNTAX_FRAGMENTS), fc.string({unit: 'grapheme-ascii', maxLength: 8})), {maxLength: 5})
            .map(parts => parts.join('')),
        weight: 3,
    },
);

/* Lines of random text mixed with syntax fragments, joined by LF, CRLF or blank lines. */
export const arbitraryHostileLines: fc.Arbitrary<string> = fc
    .tuple(
        fc.constantFrom('\n', '\r\n', '\n\n'),
        fc.array(arbitraryHostileLine, {maxLength: 12}),
    )
    .map(([separator, lines]) => lines.join(separator));

/* Any string, including lone surrogates and control characters. */
export const arbitraryHostileString: fc.Arbitrary<string> = fc.oneof(
    fc.string({unit: 'binary', maxLength: 200}),
    fc.string({unit: 'grapheme', maxLength: 200}),
);

/* Text for text parsers: syntax-aware lines or arbitrary strings. */
export const arbitraryHostileText: fc.Arbitrary<string> = fc.oneof(arbitraryHostileLines, arbitraryHostileString);

/* Arbitrary bytes. */
export const arbitraryHostileBytes: fc.Arbitrary<Uint8Array> = fc.uint8Array({maxLength: 256});

/* Valid bytes damaged by flipping, overwriting, truncating or appending (for decoders and archive readers). */
export const arbitraryCorruptedBytes = (valid: Uint8Array): fc.Arbitrary<Uint8Array> => {
    if (valid.length === 0) {
        return arbitraryHostileBytes;
    }

    const flip = fc
        .array(fc.tuple(fc.nat({max: valid.length - 1}), fc.integer({min: 0, max: 255})), {minLength: 1, maxLength: 8})
        .map(edits => {
            const copy = valid.slice();

            edits.forEach(([index, byte]) => {
                copy[index] = byte;
            });

            return copy;
        });
    const truncate = fc.nat({max: valid.length - 1}).map(length => valid.slice(0, length));
    const append = fc.uint8Array({minLength: 1, maxLength: 32}).map(tail => {
        const copy = new Uint8Array(valid.length + tail.length);

        copy.set(valid);
        copy.set(tail, valid.length);

        return copy;
    });

    return fc.oneof(flip, truncate, append);
};
