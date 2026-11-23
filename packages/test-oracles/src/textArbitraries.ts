import * as fc from 'fast-check';

/*
 * Text building blocks shared by the document generators. Generated words start with a letter or
 * digit, so a block never starts with block syntax (`~`, `(`, `!`, `#`, `[[`, `^`, `\`). Each such
 * leading character is covered by a named regression test in
 * packages/script/src/serialization/stagisticRoundTrip.property.test.ts (dialogue `!`/`(`/`~`/`^`/`\`,
 * stage direction `#`/`[[`/`~`/`(`); `*` `_` `\` `@` `!` `(` appear after words (the format escapes them).
 */

const LOWER_LETTERS = 'abcdefghijklmnopqrstuvwxyzáčďéěíňóřšťúůýž'.split('');
const UPPER_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ'.split('');

export const arbitraryLowerWord = fc.string({
    unit: fc.constantFrom(...LOWER_LETTERS),
    minLength: 1,
    maxLength: 8,
});
export const arbitraryUpperWord = fc.string({
    unit: fc.constantFrom(...UPPER_LETTERS),
    minLength: 2,
    maxLength: 8,
});

const arbitraryDigits = fc.string({
    unit: fc.constantFrom(...'0123456789'.split('')),
    minLength: 1,
    maxLength: 4,
});
const arbitraryWord = fc.oneof({arbitrary: arbitraryLowerWord, weight: 9}, {arbitrary: arbitraryDigits, weight: 1});
const arbitraryWordEnding = fc.constantFrom('', '', '', '', '.', ',', ';', ':', '?', '!', '"', '\'', '-', '_', '*', '\\', '@', '@@', '^', '(', ')');

export const capitalize = (value: string) => (value.length >= 2 ? `${value[0].toLocaleUpperCase()}${value.slice(1)}` : value);

/*
 * Lowercase words (and short numbers) with light punctuation and the escaped characters
 * `*` `_` `\` `@`, 1-6 words. A capitalised first word keeps a lowercase letter.
 */
export const arbitraryPlainText = fc
    .tuple(
        fc.boolean(),
        fc.tuple(arbitraryWord, arbitraryWordEnding),
        fc.array(fc.tuple(arbitraryWord, arbitraryWordEnding), {minLength: 0, maxLength: 5}),
    )
    .map(([
        capital,
        first,
        rest,
    ]) => {
        const [firstWord, firstEnding] = first;
        const lead = `${capital ? capitalize(firstWord) : firstWord}${firstEnding}`;

        return [lead, ...rest.map(([text, ending]) => `${text}${ending}`)].join(' ');
    })
    .filter(text => (/\p{Ll}/u).test(text));

/* Uppercase words (a lyric line reads back as lyrics only when it is all uppercase). */
export const arbitraryUpperText = fc
    .array(arbitraryUpperWord, {minLength: 1, maxLength: 5})
    .map(words => words.join(' '));

export type EmphasisMark = 'bold' | 'italic' | 'underline';

const EMPHASIS_ORDER: EmphasisMark[] = [
    'bold',
    'italic',
    'underline',
];

export const arbitraryEmphasis: fc.Arbitrary<EmphasisMark[]> = fc
    .subarray(EMPHASIS_ORDER)
    .map(marks => EMPHASIS_ORDER.filter(mark => marks.includes(mark)));

export interface TextRun {
    text: string,
    emphasis: EmphasisMark[],
}

/*
 * Runs of text where some words carry bold/italic/underline. Runs are separated by a
 * plain space, so adjacent runs never merge into one emphasised stretch.
 */
export const arbitraryTextRuns = (words: fc.Arbitrary<string> = arbitraryPlainText): fc.Arbitrary<TextRun[]> => {
    const run = fc.record({
        text: words,
        emphasis: fc.oneof({arbitrary: fc.constant<EmphasisMark[]>([]), weight: 3}, {arbitrary: arbitraryEmphasis, weight: 2}),
    });

    return fc.array(run, {minLength: 1, maxLength: 3}).map(runs => {
        const result: TextRun[] = [];

        runs.forEach((current, index) => {
            if (index > 0) {
                result.push({text: ' ', emphasis: []});
            }

            result.push(current);
        });

        return result;
    });
};
