import type {APIRoute} from 'astro';

import {getPublishedArticles} from '../data/articles';

const staticPaths = [
    '/',
    '/editor/playwriting',
    '/editor/musicals',
    '/editor/syntax',
    '/open-source',
    '/articles',
];

const escapeXml = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;');

export const GET = (async ({site}) => {
    if (!site) throw new Error('The marketing site URL must be configured to generate its sitemap.');

    const articles = await getPublishedArticles();
    const paths = [...staticPaths, ...articles.map(article => `/articles/${article.id}`)];
    const urls = paths.map(path => {
        const url = new URL(path, site).href.replace(/\/$/, '');

        return `    <url><loc>${escapeXml(url)}</loc></url>`;
    }).join('\n');

    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`, {
        headers: {'Content-Type': 'application/xml; charset=utf-8'},
    });
}) satisfies APIRoute;
