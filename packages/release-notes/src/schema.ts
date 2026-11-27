import {z} from 'zod';

import {isReleaseNumber, RELEASE_BUMPS} from './version';

export const RELEASE_NOTE_TYPES = [
    'feature',
    'improvement',
    'fix',
] as const;
export type ReleaseNoteType = (typeof RELEASE_NOTE_TYPES)[number];

export const RELEASE_NOTE_SURFACES = ['web', 'desktop'] as const;
/** Where a note applies. A note without a Surface applies to both. */
export type ReleaseNoteSurface = (typeof RELEASE_NOTE_SURFACES)[number];

const text = z.string().trim().min(1);

const noteFields = {
    type: z.enum(RELEASE_NOTE_TYPES),
    title: text,
    /** Announced in the app. Patch Releases never open a popup, so a Highlight there is only a dot. */
    highlight: z.boolean().default(false),
    /** A change that alters how existing writers' data behaves. The popup shows it first with a warning. */
    breaking: z.boolean().default(false),
    image: text.optional(),
    docs: text.optional(),
    article: text.optional(),
    /** Absent means both Surfaces. */
    surface: z.enum(RELEASE_NOTE_SURFACES).optional(),
};

type BreakingCheck = {
    highlight: boolean,
    breaking: boolean,
    bump?: 'minor' | 'patch',
};

const checkBreaking = (note: BreakingCheck, context: z.RefinementCtx): void => {
    if (!note.breaking) {
        return;
    }

    if (!note.highlight) {
        context.addIssue({
            code: 'custom',
            path: ['breaking'],
            message: 'a breaking change must also be a highlight (highlight: true), or writers are never warned',
        });
    }

    if (note.bump === 'patch') {
        context.addIssue({
            code: 'custom',
            path: ['breaking'],
            message: 'a breaking change needs bump: minor, as patch Releases never open the popup',
        });
    }
};

/** Front matter of a file in `releases/next/`. The body is the description. */
export const releaseNoteFragmentSchema = z
    .strictObject({...noteFields, bump: z.enum(RELEASE_BUMPS)})
    .superRefine(checkBreaking);

/** One note inside a finished Release. */
export const releaseNoteSchema = z
    .strictObject({...noteFields, description: text})
    .superRefine(checkBreaking);

const isCalendarDate = (value: string): boolean => {
    const match = (/^(\d{4})-(\d{2})-(\d{2})$/).exec(value);

    if (!match) {
        return false;
    }

    const [
        year,
        month,
        day,
    ] = [
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
    ];
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

export const isReleaseDate = (value: string): boolean => isCalendarDate(value);

export const releaseDateSchema = z.string().refine(isCalendarDate, 'date must be a real calendar day written YYYY-MM-DD');

/** Front matter of a file in `releases/`. */
export const releaseSchema = z.strictObject({
    release: z.string().refine(isReleaseNumber, 'release must look like 0.2.0'),
    date: releaseDateSchema,
    notes: z.array(releaseNoteSchema).min(1, 'a Release needs at least one note'),
});

export type ReleaseNoteFragment = z.infer<typeof releaseNoteFragmentSchema> & {description: string};
export type ReleaseNote = z.infer<typeof releaseNoteSchema>;
export type Release = z.infer<typeof releaseSchema>;
