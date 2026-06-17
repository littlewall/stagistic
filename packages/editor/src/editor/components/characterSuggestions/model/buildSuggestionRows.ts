export const buildSuggestionRows = ({
    counts,
    activeKey,
    excludedKeys,
    limit,
    previousOrderByKey,
}: {
    counts: ReadonlyMap<string, number>,
    activeKey: string,
    /**
     * Keys that must not appear in the suggestion list, in addition to
     * `activeKey`. Used to hide the other characters already present in
     * the same `+`-joined character group, since adding them again would
     * be a no-op (the apply step dedupes anyway).
     */
    excludedKeys?: ReadonlySet<string>,
    limit: number,
    previousOrderByKey?: ReadonlyMap<string, number>,
}) => {
    const query = activeKey.trim();
    const rows = Array.from(counts.entries())
        .filter(([key]) => {
            if (key === activeKey || excludedKeys?.has(key)) {
                return false;
            }

            return query.length === 0 || key.startsWith(query);
        });

    return rows
        .sort((a, b) => {
            if (query.length === 0 && previousOrderByKey) {
                const aPreviousOrder = previousOrderByKey.get(a[0]);
                const bPreviousOrder = previousOrderByKey.get(b[0]);

                if (aPreviousOrder !== undefined && bPreviousOrder !== undefined && aPreviousOrder !== bPreviousOrder) {
                    return aPreviousOrder - bPreviousOrder;
                }

                if (aPreviousOrder !== undefined) {
                    return -1;
                }

                if (bPreviousOrder !== undefined) {
                    return 1;
                }
            }

            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit);
};
