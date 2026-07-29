import type {ScriptSummary} from '@stagistic/app-core';

export type ScriptSort = 'newest' | 'title';

interface BuildHomeDashboardModelArgs {
    scripts: ScriptSummary[],
    query: string,
    sort: ScriptSort,
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

export const buildHomeDashboardModel = ({
    scripts,
    query,
    sort,
}: BuildHomeDashboardModelArgs) => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = scripts.filter(script => matchesQuery(script, normalizedQuery));

    return {
        scripts: [...filtered].sort(sort === 'title' ? sortByTitle : sortNewest),
    };
};
