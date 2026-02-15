export const buildSuggestionRows = ({
    counts,
    activeKey,
    occupiedKeys,
    query,
    shouldFilterByPrefix,
    limit,
}: {
    counts: ReadonlyMap<string, number>,
    activeKey: string,
    occupiedKeys: ReadonlySet<string>,
    query: string,
    shouldFilterByPrefix: boolean,
    limit: number,
}) => {
    return Array.from(counts.entries())
        .filter(([key]) => key !== activeKey)
        .filter(([key]) => !occupiedKeys.has(key))
        .filter(([key]) => !shouldFilterByPrefix || query.length === 0 || key.startsWith(query))
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit);
};
