import {getCollection} from 'astro:content';

export const getPublishedArticles = async () => {
    const now = new Date();
    const articles = await getCollection('articles', ({data}) => !data.draft && data.publishDate <= now);

    return articles.sort((a, b) => b.data.publishDate.getTime() - a.data.publishDate.getTime());
};

export const formatArticleDate = (date: Date) => new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
}).format(date);
