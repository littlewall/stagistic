import {
    BREAKING_NOTE_LABEL,
    RELEASE_NOTE_SURFACE_LABELS,
    RELEASE_NOTE_TYPE_LABELS,
} from './noteLabels';
import type {Release, ReleaseNote} from './schema';
import {RELEASE_NOTE_TYPES} from './schema';

/** Same order as the changelog: breaking first, then features, improvements and fixes. */
const orderNotes = (notes: readonly ReleaseNote[]): ReleaseNote[] => [
    ...notes.filter(note => note.breaking),
    ...RELEASE_NOTE_TYPES.flatMap(type => notes.filter(note => !note.breaking && note.type === type)),
];

const noteMarkdown = (note: ReleaseNote): string => {
    const surface = note.surface === undefined ? undefined : RELEASE_NOTE_SURFACE_LABELS[note.surface];
    const label = note.breaking ? BREAKING_NOTE_LABEL : RELEASE_NOTE_TYPE_LABELS[note.type];
    const heading = `### ${label}: ${note.title}${surface === undefined ? '' : ` (${surface})`}`;

    return `${heading}\n\n${note.description}`;
};

/** GitHub Release text for one Release: every note, in changelog order, with type labels. */
export const renderGithubRelease = (release: Release): string => `${orderNotes(release.notes).map(noteMarkdown).join('\n\n')}\n`;
