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
    const getMatchRank = (key: string) => {
        if (query.length === 0) {
            return 0;
        }

        if (key.startsWith(query)) {
            return 2;
        }

        if (key.includes(query)) {
            return 1;
        }

        return 0;
    };
    const getMatchOffset = (key: string) => {
        if (query.length === 0) {
            return Number.MAX_SAFE_INTEGER;
        }

        const offset = key.indexOf(query);

        return offset >= 0 ? offset : Number.MAX_SAFE_INTEGER;
    };

    const rows = Array.from(counts.entries())
        .filter(([key]) => key !== activeKey && !excludedKeys?.has(key));
    const hasAnyMatch = query.length > 0 && rows.some(([key]) => getMatchRank(key) > 0);

    return rows
        .sort((a, b) => {
            const aRank = getMatchRank(a[0]);
            const bRank = getMatchRank(b[0]);

            if (bRank !== aRank) {
                return bRank - aRank;
            }

            if (!hasAnyMatch && previousOrderByKey) {
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

            const aOffset = getMatchOffset(a[0]);
            const bOffset = getMatchOffset(b[0]);

            if (aOffset !== bOffset) {
                return aOffset - bOffset;
            }

            if (b[1] !== a[1]) {
                return b[1] - a[1];
            }

            return a[0].localeCompare(b[0]);
        })
        .slice(0, limit);
};
