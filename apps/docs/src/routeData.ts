import {defineRouteMiddleware} from '@astrojs/starlight/route-data';

import {getDocumentationSection} from './navigation/sections';

export const onRequest = defineRouteMiddleware(({locals, url}) => {
    const section = getDocumentationSection(url.pathname);
    const {starlightRoute} = locals;

    starlightRoute.sidebar = starlightRoute.sidebar.flatMap(entry => (
        entry.type === 'group' && entry.label === section?.label ? entry.entries : []
    ));

    for (const {tag, attrs} of starlightRoute.head) {
        if (tag !== 'meta' || !attrs || typeof attrs.content !== 'string') continue;

        if (attrs.name !== 'description' && attrs.property !== 'og:description' && attrs.name !== 'twitter:description') continue;

        attrs.content = attrs.content.replace(/`([^`]+)`/g, '$1');
    }
});
