import type starlight from '@astrojs/starlight';

type DocumentationSection = {
    label: string,
    href: string,
    description: string,
    // Lucode's mobile drawer supports groups of immediate links, not nested groups or root links.
    sidebar: NonNullable<Parameters<typeof starlight>[0]['sidebar']>,
};

export const documentationSections: DocumentationSection[] = [
    {
        label: 'Editor',
        href: '/editor/',
        description: 'Write, organize and prepare theatre and musical scripts with Stagistic Editor.',
        sidebar: [
            {
                label: 'Start here',
                items: [
                    {label: 'Editor overview', slug: 'editor'},
                    'editor/getting-started',
                ],
            },
            {
                label: 'Scripts and files',
                items: [
                    {label: 'Overview', slug: 'editor/scripts'},
                    'editor/scripts/create',
                    'editor/scripts/find',
                    'editor/scripts/copies',
                    'editor/scripts/saving',
                    'editor/scripts/drafts-and-versions',
                    'editor/scripts/download',
                    'editor/scripts/import',
                    'editor/scripts/delete',
                ],
            },
            {
                label: 'Writing your script',
                items: [
                    {label: 'Overview', slug: 'editor/writing'},
                    'editor/writing/blocks',
                    'editor/writing/flow',
                    'editor/writing/customize-flow',
                    'editor/writing/dialogue',
                    'editor/writing/stage-directions',
                    'editor/writing/formatting',
                    'editor/writing/shortcuts',
                ],
            },
            {
                label: 'Acts and scenes',
                items: [
                    {label: 'Overview', slug: 'editor/structure'},
                    'editor/structure/add',
                    'editor/structure/navigate',
                    'editor/structure/rearrange',
                    'editor/structure/details',
                    'editor/structure/numbering',
                    'editor/structure/headings',
                ],
            },
            {
                label: 'Characters',
                items: [
                    {label: 'Overview', slug: 'editor/characters'},
                    'editor/characters/speakers',
                    'editor/characters/confirmation',
                    'editor/characters/multiple-speakers',
                    'editor/characters/groups',
                    'editor/characters/references',
                    'editor/characters/manage',
                ],
            },
            {
                label: 'Music and lyrics',
                items: [
                    {label: 'Overview', slug: 'editor/music'},
                    'editor/music/add',
                    'editor/music/range',
                    'editor/music/lyrics',
                    'editor/music/navigate',
                    'editor/music/manage',
                    'editor/music/score',
                    'editor/music/remove',
                ],
            },
            {
                label: 'Finding and reviewing',
                items: [
                    {label: 'Overview', slug: 'editor/review'},
                    'editor/review/find',
                    'editor/review/replace',
                    'editor/review/comment',
                    'editor/review/threads',
                    'editor/review/comments-view',
                    'editor/review/history',
                ],
            },
            {
                label: 'Pages and export',
                items: [
                    {label: 'Overview', slug: 'editor/export'},
                    'editor/export/pdf',
                    'editor/export/layout',
                    'editor/export/title-page',
                    'editor/export/headers-footers',
                    'editor/export/initial-pages',
                    'editor/export/characters',
                    'editor/export/page-breaks',
                    'editor/export/integrated-score',
                ],
            },
        ],
    },
    {
        label: 'Syntax',
        href: '/syntax/',
        description: 'Read the Stagistic text format reference for implementations and plain-text writing.',
        sidebar: [
            {
                label: 'Format reference',
                items: [
                    {label: 'Syntax overview', slug: 'syntax'},
                    'syntax/reference',
                    'syntax/reference/frontmatter',
                    'syntax/reference/structure',
                    'syntax/reference/speech',
                    'syntax/reference/directions',
                    'syntax/reference/music',
                    'syntax/reference/text',
                ],
            },
            {
                label: 'Examples and lookup',
                items: [
                    'syntax/examples',
                    'syntax/markers',
                ],
            },
        ],
    },
];

export const getDocumentationSection = (pathname: string) => documentationSections.find(section => {
    const rootPath = section.href.slice(0, -1);

    return pathname === rootPath || pathname.startsWith(section.href);
});
