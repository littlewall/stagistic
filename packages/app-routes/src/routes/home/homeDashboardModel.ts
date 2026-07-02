import type {ScriptSummary} from '@stagistic/app-core';

const DAY_MS = 24 * 60 * 60 * 1000;
const CONTINUE_WRITING_DAYS = 7;
const RECENTLY_EDITED_DAYS = 30;

export type ScriptSort = 'newest' | 'title';

interface BuildHomeDashboardModelArgs {
    scripts: ScriptSummary[],
    query: string,
    sort: ScriptSort,
    now?: number,
}

const sortNewest = (left: ScriptSummary, right: ScriptSummary) => {
    return right.updatedAt - left.updatedAt;
};

const sortByTitle = (left: ScriptSummary, right: ScriptSummary) => {
    return left.title.localeCompare(right.title, undefined, {sensitivity: 'base'});
};

const matchesQuery = (script: ScriptSummary, normalizedQuery: string) => {
    if (!normalizedQuery) {
        return true;
    }

    const title = script.title.toLocaleLowerCase();
    const subtitle = script.subtitle?.toLocaleLowerCase() ?? '';

    return title.includes(normalizedQuery) || subtitle.includes(normalizedQuery);
};

const wasEditedWithin = (timestamp: number, days: number, now: number) => {
    return timestamp >= now - days * DAY_MS;
};

export const buildHomeDashboardModel = ({
    scripts,
    query,
    sort,
    now = Date.now(),
}: BuildHomeDashboardModelArgs) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = scripts.filter(script => matchesQuery(script, normalizedQuery));
    const newestFirst = [...filtered].sort(sortNewest);
    const continueWriting = newestFirst.filter(script => wasEditedWithin(script.updatedAt, CONTINUE_WRITING_DAYS, now));

    return {
        continueWriting,
        recentlyEdited: newestFirst.filter(script => !wasEditedWithin(script.updatedAt, CONTINUE_WRITING_DAYS, now)
            && wasEditedWithin(script.updatedAt, RECENTLY_EDITED_DAYS, now)),
        allScripts: [...filtered].sort(sort === 'title' ? sortByTitle : sortNewest),
    };
};
