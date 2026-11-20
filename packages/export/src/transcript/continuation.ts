import type {PaginationOverrides} from '../model/plan';
import type {VisualLine} from '../model/visualLine';
import {makeRun, resolveLineX} from './lineLayout';
import type {PreparedBlock, WrappedLine} from './model';
import {wrapSegments} from './wrapSegments';

export const buildContinuationCues = (blocks: PreparedBlock[], flow: PaginationOverrides): Array<PreparedBlock | null> => {
    let character: PreparedBlock | null = null;

    return blocks.map(block => {
        if (block.blockType === 'character') character = block;

        if (block.blockType === 'act' || block.blockType === 'scene') character = null;

        if (!flow.repeatCharacterOnBreak || block.blockType !== 'dialogue' || !character) return null;

        const suffix = {
            none: '',
            contd: ' (CONT\'D)',
            cont: ' (Cont.)',
        }[flow.continuationMark ?? 'none'];
        const text = character.wrapped.map(line => line.text).join(' ') + suffix;

        return {...character, wrapped: wrapSegments([{text, style: {}}], Math.max(1, Math.floor(character.availableWidthPx / character.charWidthPx)))};
    });
};

export const renderPreparedLine = (item: PreparedBlock, line: WrappedLine, y: number, sourceBlockId?: string): VisualLine => {
    let x = resolveLineX({
        block: item.block,
        line: line.text,
        baseX: item.baseX,
        availableWidthPx: item.availableWidthPx,
        charWidthPx: item.charWidthPx,
    });

    return {
        y,
        sourceBlockId,
        runs: line.segments.map(segment => {
            const run = makeRun(segment.text, x, item.block, item.fontSizePx, segment.style);

            x += segment.text.length * item.charWidthPx;

            return run;
        }),
    };
};
