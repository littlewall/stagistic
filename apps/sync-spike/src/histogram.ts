export const percentile = (sorted: readonly number[], p: number) => {
    if (sorted.length === 0) {
        return 0;
    }

    return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

export const createHistogram = () => {
    let samples: number[] = [];

    return {
        record: (value: number) => {
            samples.push(value);
        },
        reset: () => {
            samples = [];
        },
        values: () => samples,
        summary: () => {
            const sorted = [...samples].sort((a, b) => a - b);

            return {
                count: sorted.length,
                p50: percentile(sorted, 50),
                p95: percentile(sorted, 95),
                p99: percentile(sorted, 99),
                max: sorted.at(-1) ?? 0,
            };
        },
    };
};
