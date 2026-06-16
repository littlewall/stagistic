import {type BlockLine} from '../types';

export type SplitDecision =
    | {
        kind: 'split', breakPos: number, fragmentHeight: number,
    }
    | {kind: 'pushDown'}
    | {kind: 'forcePlace'};

export interface SelectSplitPointArgs {
    lines: BlockLine[],
    consumedHeight: number,
    spaceLeft: number,
    minLinesBefore: number,
    minLinesAfter: number,
    epsilonPx: number,
    canPushDown: boolean,
}

export const selectSplitPoint = ({
    lines,
    consumedHeight,
    spaceLeft,
    minLinesBefore,
    minLinesAfter,
    epsilonPx,
    canPushDown,
}: SelectSplitPointArgs): SplitDecision => {
    const firstUnplaced = lines.findIndex(line => line.topRel >= consumedHeight - epsilonPx);

    if (firstUnplaced === -1) {
        return {kind: 'forcePlace'};
    }

    const findSplitIndex = (minBefore: number, minAfter: number): number | null => {
        const maxIndex = lines.length - minAfter;
        let best: number | null = null;

        for (let index = firstUnplaced + 1; index <= maxIndex; index += 1) {
            if (lines[index].topRel - consumedHeight <= spaceLeft + epsilonPx) {
                best = index;
            }
        }

        if (best === null || best - firstUnplaced < minBefore) {
            return null;
        }

        return best;
    };

    const buildSplit = (index: number): SplitDecision => ({
        kind: 'split',
        breakPos: lines[index].startPos,
        fragmentHeight: lines[index].topRel - consumedHeight,
    });

    const strict = findSplitIndex(minLinesBefore, minLinesAfter);

    if (strict !== null) {
        return buildSplit(strict);
    }

    if (canPushDown) {
        return {kind: 'pushDown'};
    }

    const relaxed = findSplitIndex(1, 1);

    if (relaxed !== null) {
        return buildSplit(relaxed);
    }

    return {kind: 'forcePlace'};
};
