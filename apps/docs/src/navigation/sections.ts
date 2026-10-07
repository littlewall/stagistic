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
                label: 'User guide',
                items: [
                    'editor/scripts',
                    'editor/music',
                    'editor/review',
                    'editor/export',
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
        ],
    },
    {
        label: 'Syntax',
        href: '/syntax/',
        description: 'Explore the Stagistic text format and its technical reference for files and integrations.',
        sidebar: [
            {
                label: 'Reference',
                items: [
                    {label: 'Syntax overview', slug: 'syntax'},
                    'syntax/reference',
                ],
            },
        ],
    },
];

export const getDocumentationSection = (pathname: string) => documentationSections.find(section => {
    const rootPath = section.href.slice(0, -1);

    return pathname === rootPath || pathname.startsWith(section.href);
});
