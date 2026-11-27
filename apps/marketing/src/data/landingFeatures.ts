import {DOCS_URL} from './site';

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

/** The home page features: the writer's core work, then read-only MCP. A feature without media is text-only until its graphic exists. */
export const landingFeatures: LandingFeature[] = [
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
        label: 'Characters that come from your script',
        description:
                'Build a character catalogue directly from your script. Assign colours, highlight appearances, group characters, rename characters, tag them inside stage directions, and write dialogue for two or more characters speaking together.',
        videoSrc: '/features/characters.mp4',
        videoTitle: 'Managing characters in Stagistic Editor',
        videoFit: 'contain',
        shape: 'two',
    },
    {
        label: 'Lyrics, songs and scores',
        description:
                'Write lyrics as their own block type, manage songs and instrumentals, place music cues directly in the script, and attach score PDFs to individual musical numbers.',
        videoSrc: '/features/musical-theatre.mp4',
        videoTitle: 'Writing lyrics and managing musical numbers in Stagistic Editor',
        videoFit: 'contain',
        shape: 'three',
        href: '/editor/musicals',
        linkLabel: 'Explore musical theatre writing',
    },
    {
        label: 'Templates and a writing flow you can configure',
        description:
                'Start from a format template, then configure page format, title page, headers and footers, and each block\'s indentation, alignment, emphasis, and casing. Set keyboard shortcuts and decide which block follows next.',
        videoSrc: '/features/writing-flow.mp4',
        videoTitle: 'Configuring formatting and writing flow in Stagistic Editor',
        videoFit: 'contain',
        shape: 'one',
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
];

export interface LandingMinorFeature {
    label: string,
    description: string,
    href?: string,
    linkLabel?: string,
}

/** Smaller features below the main ones: a third of the column each, text only, kept short. */
export const landingMinorFeatures: LandingMinorFeature[] = [
    {
        label: 'The Board',
        description: 'See the whole show at a glance: scenes on a Wall, characters across scenes, each character\'s Arc, and a Rundown of songs.',
    },
    {
        label: 'Drafts and Versions',
        description: 'Save a Draft before a rewrite or a named Version for a reading. Look back, restore, or start a new script from it.',
    },
    {
        label: 'Read-only access for AI apps',
        description: 'In the Mac app, an AI app can read your scripts through MCP, but never change them. Off until you turn it on.',
        href: `${DOCS_URL}/mac-app/claude-mcp/`,
        linkLabel: 'MCP connection',
    },
];
