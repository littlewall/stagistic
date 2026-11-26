export interface LandingFeature {
    label: string,
    description: string,
    videoSrc?: string,
    videoTitle?: string,
    videoFit?: 'contain' | 'cover',
    imageSrc?: string,
    imageAlt?: string,
    imageFit?: 'contain' | 'cover',
    shape?: 'one' | 'two' | 'three',
    href?: string,
    linkLabel?: string,
}

export interface LandingFeatureGroup {
    /** The writer's work this group serves; shown as the group heading. */
    title: string,
    features: LandingFeature[],
}

/** Features grouped by the writer's work. A feature without media is text-only until its graphic exists. */
export const landingFeatureGroups: LandingFeatureGroup[] = [
    {
        title: 'Write',
        features: [
            {
                label: 'A playwriting structure',
                description:
                    'Dedicated blocks for acts, scene headings, character cues, dialogue, stage directions, lyrics, and notes. Every part of the script keeps its own formatting and behaviour.',
                videoSrc: '/features/theatre-writing.mp4',
                videoTitle: 'A formatted theatre script in Stagistic Editor',
                videoFit: 'contain',
                shape: 'one',
                href: '/editor/playwriting',
                linkLabel: 'Explore stage playwriting',
            },
            {
                label: 'Acts and scenes that stay connected',
                description:
                    'A live outline keeps the structure visible as you write. Jump directly to any scene, reorder scenes, and group them into acts instead of forcing your play into a screenplay-shaped structure.',
                videoSrc: '/features/acts-and-scenes.mp4',
                videoTitle: 'The scene outline beside a script in Stagistic Editor',
                videoFit: 'contain',
                shape: 'two',
            },
            {
                label: 'Characters that come from your script',
                description:
                    'Build a character catalogue directly from your script. Assign colours, highlight appearances, group characters, rename characters, tag them inside stage directions, and write dialogue for two or more characters speaking together.',
                videoSrc: '/features/characters.mp4',
                videoTitle: 'Managing characters in Stagistic Editor',
                videoFit: 'contain',
                shape: 'three',
            },
        ],
    },
    {
        title: 'Musicals',
        features: [
            {
                label: 'Lyrics, songs and scores',
                description:
                    'Write lyrics as their own block type, manage songs and instrumentals, place music cues directly in the script, and attach score PDFs to individual musical numbers.',
                videoSrc: '/features/musical-theatre.mp4',
                videoTitle: 'Writing lyrics and managing musical numbers in Stagistic Editor',
                videoFit: 'contain',
                shape: 'one',
                href: '/editor/musicals',
                linkLabel: 'Explore musical theatre writing',
            },
        ],
    },
    {
        title: 'Plan',
        features: [
            {
                label: 'The Board',
                description:
                    'See the whole show at a glance. The Board is a live view of your script with four Lenses: the Wall of scenes, a Matrix of characters across scenes, each character\'s Arc, and a Rundown of acts, scenes and songs.',
            },
        ],
    },
    {
        title: 'Format and export',
        features: [
            {
                label: 'Templates and a writing flow you can configure',
                description:
                    'Start from a format template, then configure page format, title page, headers and footers, and each block\'s indentation, alignment, emphasis, and casing. Set keyboard shortcuts and decide which block follows next.',
                videoSrc: '/features/writing-flow.mp4',
                videoTitle: 'Configuring formatting and writing flow in Stagistic Editor',
                videoFit: 'contain',
                shape: 'three',
            },
            {
                label: 'Print-ready PDF, scores included',
                description:
                    'Export your script and sheet music into a single PDF. Page numbering runs across your text and inserted music scores, so actors and musicians always stay on the same page.',
                imageSrc: '/features/export.png',
                imageAlt: 'A print-ready theatre script displayed in Stagistic Editor',
                imageFit: 'cover',
                shape: 'two',
            },
        ],
    },
    {
        title: 'Keep',
        features: [
            {
                label: 'Script Drafts and Versions',
                description:
                    'Save a numbered Script Draft before a rewrite, or a named Script Version for a reading, festival or tour. Look back at what you saved, restore it, or make a separate script from it.',
            },
            {
                label: 'Your scripts stay on your computer',
                description:
                    'Scripts are stored in your browser or in the Mac app, and are never uploaded. Export a script as a file whenever you like. The Mac app also makes automatic backups.',
            },
        ],
    },
];
