interface BalancedLines {
    lines: string[],
    score: number,
}

const wrapGreedily = (
    words: string[],
    maxChars: number,
): string[] => {
    const lines: string[] = [];
    let current = '';

    words.forEach(word => {
        if (word.length > maxChars) {
            if (current) {
                lines.push(current);
                current = '';
            }

            for (let index = 0; index < word.length; index += maxChars) {
                lines.push(word.slice(index, index + maxChars));
            }

            return;
        }

        const candidate = current ? `${current} ${word}` : word;

        if (candidate.length <= maxChars) {
            current = candidate;

            return;
        }

        if (current) {
            lines.push(current);
        }

        current = word;
    });

    if (current) {
        lines.push(current);
    }

    return lines;
};

export const balanceTextLines = (
    text: string,
    maxChars: number,
): string[] => {
    const words = text.trim().split(/\s+/u).filter(Boolean);

    if (words.length === 0) {
        return [];
    }

    if (words.some(word => word.length > maxChars)) {
        return wrapGreedily(words, maxChars);
    }

    const lineCount = wrapGreedily(words, maxChars).length;
    const visibleCharacterCount = words.join(' ').length - lineCount + 1;
    const targetLineLength = visibleCharacterCount / lineCount;
    const memo = new Map<string, BalancedLines | null>();

    const findBestLines = (
        startIndex: number,
        remainingLines: number,
    ): BalancedLines | null => {
        const key = `${startIndex}:${remainingLines}`;
        const cached = memo.get(key);

        if (cached !== undefined) {
            return cached;
        }

        if (remainingLines === 0) {
            const result = startIndex === words.length
                ? {lines: [], score: 0}
                : null;

            memo.set(key, result);

            return result;
        }

        let best: BalancedLines | null = null;
        let line = '';

        for (
            let endIndex = startIndex;
            endIndex < words.length;
            endIndex += 1
        ) {
            line = line ? `${line} ${words[endIndex]}` : words[endIndex];

            if (line.length > maxChars) {
                break;
            }

            const rest = findBestLines(endIndex + 1, remainingLines - 1);

            if (!rest) {
                continue;
            }

            const score = (line.length - targetLineLength) ** 2 + rest.score;

            if (!best || score < best.score) {
                best = {
                    lines: [line, ...rest.lines],
                    score,
                };
            }
        }

        memo.set(key, best);

        return best;
    };

    return findBestLines(0, lineCount)?.lines ?? wrapGreedily(words, maxChars);
};
