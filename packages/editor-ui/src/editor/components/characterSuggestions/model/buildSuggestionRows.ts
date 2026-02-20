export const buildSuggestionRows = ({
    counts,
    activeKey,
    occupiedKeys,
    limit,
}: {
    counts: ReadonlyMap<string, number>,
    activeKey: string,
    occupiedKeys: ReadonlySet<string>,
    limit: number,
}) => {
    return Array.from(counts.entries())
        .filter(([key]) => key !== activeKey)
        .filter(([key]) => !occupiedKeys.has(key))
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit);
};
