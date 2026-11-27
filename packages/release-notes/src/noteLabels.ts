import type {ReleaseNoteSurface, ReleaseNoteType} from './schema';

/**
 * The words a Release Note carries wherever Releases are shown. The order of `RELEASE_NOTE_TYPES`
 * is the display order after breaking notes. The app's What's new keeps identical copies (packages/ui
 * does not depend on this package); a test in app-routes pins them together.
 */
export const RELEASE_NOTE_TYPE_LABELS: Readonly<Record<ReleaseNoteType, string>> = {
    feature: 'New',
    improvement: 'Improved',
    fix: 'Fixed',
};

export type ReleaseNoteWeight = 'highlight' | 'fix' | 'plain';

/**
 * How much a note weighs, shown as the colour of its type pill: Highlights lead, fixes are
 * flagged, everything else stays plain. The app's What's new keeps an identical copy (packages/ui
 * does not depend on this package); a test in app-routes pins them together.
 */
export const getReleaseNoteWeight = (note: {highlight: boolean, type: ReleaseNoteType}): ReleaseNoteWeight => {
    if (note.highlight) {
        return 'highlight';
    }

    return note.type === 'fix' ? 'fix' : 'plain';
};

export const BREAKING_NOTE_LABEL = 'Breaking change';

/**
 * Label of a note that applies to one Surface only; absent for both. Web-only notes carry none,
 * as the web app is the default reading of a changelog.
 */
export const RELEASE_NOTE_SURFACE_LABELS: Readonly<Partial<Record<ReleaseNoteSurface, string>>> = {desktop: 'Mac app'};
