import {
    resolveNoteImage,
    resolveNoteLink,
} from '@stagistic/release-notes';
import type {WhatsNewRelease} from '@stagistic/ui';

/** The parts of a bundled Release Note this app reads. `@stagistic/release-notes` `Release` fits. */
export interface ReleaseSource {
    release: string,
    date: string,
    notes: readonly {
        type: 'feature' | 'improvement' | 'fix',
        title: string,
        highlight: boolean,
        breaking: boolean,
        description: string,
        image?: string,
        docs?: string,
        article?: string,
    }[],
}

const DOCS_SITE = 'https://docs.stagistic.com';
const MARKETING_SITE = 'https://stagistic.com';

export const toWhatsNewReleases = (releases: readonly ReleaseSource[]): WhatsNewRelease[] => releases
    .map(release => ({
        release: release.release,
        date: release.date,
        notes: release.notes
            .filter(note => note.highlight)
            .map(note => ({
                type: note.type,
                title: note.title,
                breaking: note.breaking,
                highlight: note.highlight,
                description: note.description,
                image: resolveNoteImage(note.image),
                docsUrl: resolveNoteLink(note.docs, DOCS_SITE),
                articleUrl: resolveNoteLink(note.article, MARKETING_SITE),
            })),
    }))
    .filter(release => release.notes.length > 0);
