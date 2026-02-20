export const buildSuggestionRows = ({
    counts,
    activeKey,
    limit,
}: {
    counts: ReadonlyMap<string, number>,
    activeKey: string,
    limit: number,
}) => {
    return Array.from(counts.entries())
        .filter(([key]) => key !== activeKey)
        .sort((a, b) => {
            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit);
};
