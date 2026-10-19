import {docsLoader, i18nLoader} from '@astrojs/starlight/loaders';
import {docsSchema, i18nSchema} from '@astrojs/starlight/schema';
import {defineCollection} from 'astro:content';
import {ExtendDocsSchema} from 'lucode-starlight/schema';

export const collections = {
    docs: defineCollection({loader: docsLoader(), schema: docsSchema({extend: ExtendDocsSchema})}),
    i18n: defineCollection({loader: i18nLoader(), schema: i18nSchema()}),
};
