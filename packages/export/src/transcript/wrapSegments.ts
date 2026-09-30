import type {
    InlineStyle, TextSegment, TextWord, WrappedLine,
} from './model';
import {pushSegment} from './textSegments';

const splitLongWord = (word: TextSegment[], maxChars: number): TextSegment[][] => {
    const chunks: TextSegment[][] = [];
    let chunk: TextSegment[] = [];
    let chunkLength = 0;

    word.forEach(segment => {
        Array.from(segment.text).forEach(character => {
            if (chunkLength === maxChars) {
                chunks.push(chunk);
                chunk = [];
                chunkLength = 0;
            }

            pushSegment(chunk, character, segment.style);
            chunkLength += 1;
        });
    });

    if (chunk.length > 0) {
        chunks.push(chunk);
    }

    return chunks;
};

const lineText = (segments: TextSegment[]): string => segments.map(segment => segment.text).join('');

const toWrappedLine = (segments: TextSegment[]): WrappedLine => ({
    text: lineText(segments),
    segments,
});

const splitWords = (segments: TextSegment[]): TextWord[] => {
    const words: TextWord[] = [];
    let current: TextSegment[] = [];
    let pendingSpaceStyle: InlineStyle = {};

    segments.forEach(segment => {
        Array.from(segment.text).forEach(character => {
            if (character === ' ') {
                if (current.length > 0) {
                    words.push({segments: current, spaceStyle: pendingSpaceStyle});
                    current = [];
                }

                pendingSpaceStyle = segment.style;

                return;
            }

            pushSegment(current, character, segment.style);
        });
    });

    if (current.length > 0) {
        words.push({segments: current, spaceStyle: pendingSpaceStyle});
    }

    return words;
};

export const wrapSegments = (segments: TextSegment[], maxChars: number) => {
    if (segments.length === 0) {
        return [toWrappedLine([])];
    }

    const lines: WrappedLine[] = [];
    let current: TextSegment[] = [];
    let currentLength = 0;

    splitWords(segments).forEach(word => {
        const wordLength = lineText(word.segments).length;

        if (wordLength > maxChars) {
            if (current.length > 0) {
                lines.push(toWrappedLine(current));
                current = [];
                currentLength = 0;
            }

            splitLongWord(word.segments, maxChars).forEach(chunk => {
                lines.push(toWrappedLine(chunk));
            });

            return;
        }

        if (current.length === 0) {
            current = [...word.segments];
            currentLength = wordLength;

            return;
        }

        if (currentLength + 1 + wordLength <= maxChars) {
            pushSegment(current, ' ', word.spaceStyle);
            word.segments.forEach(segment => pushSegment(current, segment.text, segment.style));
            currentLength += 1 + wordLength;

            return;
        }

        lines.push(toWrappedLine(current));
        current = [...word.segments];
        currentLength = wordLength;
    });

    if (current.length > 0) {
        lines.push(toWrappedLine(current));
    }

    return lines;
};
