import {glob} from 'astro/loaders';
import {z} from 'astro/zod';
import {defineCollection} from 'astro:content';

const articles = defineCollection({
    loader: glob({pattern: '**/*.md', base: './src/content/articles'}),
    schema: z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        author: z.string().trim().min(1)
            .default('Stagistic'),
        publishDate: z.coerce.date(),
        tags: z.array(z.string().trim().min(1)).default([]),
        draft: z.boolean().default(true),
    }),
});

export const collections = {articles};
