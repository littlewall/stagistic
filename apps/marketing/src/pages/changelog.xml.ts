import {releases} from '@stagistic/release-notes/bundled';
import type {APIRoute} from 'astro';

import {buildChangelogFeed, toChangelog} from '../data/changelog';

export const GET = (({site}) => {
    if (!site) throw new Error('The marketing site URL must be configured to generate the changelog feed.');

    return new Response(buildChangelogFeed(toChangelog(releases, {site}), {site}), {
        headers: {'Content-Type': 'application/rss+xml; charset=utf-8'},
    });
}) satisfies APIRoute;
