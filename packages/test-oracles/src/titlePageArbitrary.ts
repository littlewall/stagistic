import type {TitlePageSettings} from '@stagistic/script';
import * as fc from 'fast-check';

/* Single-line free text, possibly padded with whitespace; includes quotes, colons and non-ASCII. */
const arbitraryPaddedLine = fc
    .tuple(
        fc.constantFrom('', ' ', '  '),
        fc.string({
            unit: 'grapheme',
            minLength: 0,
            maxLength: 24,
        }).map(value => value.replace(/\p{C}|\p{Z}/gu, ' ')),
        fc.constantFrom('', ' ', '  '),
    )
    .map(parts => parts.join(''));

const arbitraryMultiLine = fc
    .array(arbitraryPaddedLine, {minLength: 1, maxLength: 3})
    .map(lines => lines.join('\n'));

const arbitraryCredit = fc.record({
    credit: arbitraryPaddedLine,
    authors: fc.array(arbitraryPaddedLine, {minLength: 0, maxLength: 3}),
});

const arbitraryIsoDate = fc
    .tuple(fc.integer({min: 1970, max: 2099}), fc.integer({min: 1, max: 12}), fc.integer({min: 1, max: 28}))
    .map(([
        year,
        month,
        day,
    ]) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);

/*
 * Title-page settings that reach the `.stagistic` frontmatter: subtitle, credits, source,
 * draft date (manual or auto), contact (multi-line) and copyright. `dateFormat` and `logo`
 * are not part of the file and are not generated.
 */
export const arbitraryTitlePage: fc.Arbitrary<TitlePageSettings> = fc.record(
    {
        subtitle: arbitraryPaddedLine,
        credits: fc.array(arbitraryCredit, {minLength: 0, maxLength: 3}),
        source: arbitraryPaddedLine,
        draftDateMode: fc.constantFrom('auto', 'manual'),
        draftDate: fc.oneof(arbitraryIsoDate, arbitraryPaddedLine),
        contact: arbitraryMultiLine,
        copyright: arbitraryPaddedLine,
    },
    {requiredKeys: []},
);
