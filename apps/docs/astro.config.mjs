import starlight from '@astrojs/starlight';
import {defineConfig} from 'astro/config';
import lucode from 'lucode-starlight';

import {documentationSections} from './src/navigation/sections';

export default defineConfig({
    site: 'https://docs.stagistic.com',
    output: 'static',
    trailingSlash: 'always',
    integrations: [
        starlight({
            title: 'Knowledge base',
            description: 'Documentation for Stagistic tools and the Stagistic text format.',
            favicon: '/favicon.svg',
            logo: {src: './src/assets/stagistic-mark-on-dark.svg', alt: 'Stagistic'},
            components: {
                Header: './src/components/KnowledgeBaseHeader.astro',
                ThemeProvider: './src/components/LightThemeProvider.astro',
                MarkdownContent: './src/components/KnowledgeBaseContent.astro',
                PageTitle: './src/components/KnowledgeBasePageTitle.astro',
            },
            locales: {
                root: {label: 'English', lang: 'en'},
            },
            customCss: ['./src/styles/docs.css'],
            plugins: [
                lucode({
                    warnOverrides: false,
                    footerText: 'Stagistic Knowledge base',
                    navLinks: documentationSections.map(({label, href}) => ({label, link: href})),
                }),
            ],
            routeMiddleware: './src/routeData.ts',
            head: [{tag: 'meta', attrs: {name: 'robots', content: 'noindex, nofollow'}}],
            sidebar: documentationSections.map(({label, sidebar}) => ({label, items: sidebar})),
            pagination: false,
        }),
    ],
});
