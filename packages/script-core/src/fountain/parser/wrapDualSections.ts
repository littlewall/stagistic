import {
    type ColumnElement,
    type ColumnGroupElement,
    ELEMENT_CHARACTER,
    ELEMENT_COLUMN,
    ELEMENT_COLUMN_GROUP,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    type FountainDocument,
    type FountainElement,
    type FountainElementType,
} from '../types';
import {isEmptyActionBlock} from './cleanupBlocks';

const isDialogueSectionType = (type: FountainElementType) => type === ELEMENT_CHARACTER
    || type === ELEMENT_DUAL_DIALOGUE_CHARACTER
    || type === ELEMENT_DIALOGUE
    || type === ELEMENT_DUAL_DIALOGUE
    || type === ELEMENT_PARENTHETICAL;

export const wrapDualSections = (blocksToWrap: FountainElement[]): FountainDocument => {
    const wrapped: FountainDocument = [];
    let index = 0;

    const nextNonEmptyType = (start: number) => {
        for (let i = start; i < blocksToWrap.length; i += 1) {
            if (!isEmptyActionBlock(blocksToWrap[i])) {
                return blocksToWrap[i].type;
            }
        }

        return null;
    };

    while (index < blocksToWrap.length) {
        const block = blocksToWrap[index];

        if (!isDialogueSectionType(block.type)) {
            wrapped.push(block);
            index += 1;
            continue;
        }

        const section: FountainElement[] = [];
        let cursor = index;

        while (cursor < blocksToWrap.length) {
            const current = blocksToWrap[cursor];

            if (isDialogueSectionType(current.type)) {
                section.push(current);
                cursor += 1;
                continue;
            }

            if (isEmptyActionBlock(current)) {
                const nextType = nextNonEmptyType(cursor + 1);

                if (nextType && isDialogueSectionType(nextType)) {
                    section.push(current);
                    cursor += 1;
                    continue;
                }
            }

            break;
        }

        const hasDual = section.some(
            node => node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER
                || node.type === ELEMENT_DUAL_DIALOGUE,
        );

        if (!hasDual) {
            wrapped.push(...section);
            index = cursor;
            continue;
        }

        const left: FountainElement[] = [];
        const right: FountainElement[] = [];
        let currentColumn: 'left' | 'right' = 'left';

        for (const node of section) {
            if (isEmptyActionBlock(node)) {
                continue;
            }

            if (node.type === ELEMENT_CHARACTER) {
                currentColumn = 'left';
                left.push(node);
                continue;
            }

            if (
                node.type === ELEMENT_DUAL_DIALOGUE_CHARACTER
                || node.type === ELEMENT_DUAL_DIALOGUE
            ) {
                currentColumn = 'right';
                right.push(node);
                continue;
            }

            if (node.type === ELEMENT_DIALOGUE || node.type === ELEMENT_PARENTHETICAL) {
                if (currentColumn !== 'left') {
                    right.push(node);

                    continue;
                }

                left.push(node);

                continue;
            }

            left.push(node);
        }

        const columnGroup: ColumnGroupElement = {
            type: ELEMENT_COLUMN_GROUP,
            children: [
                {
                    type: ELEMENT_COLUMN,
                    width: '50%',
                    children: left,
                } as ColumnElement, {
                    type: ELEMENT_COLUMN,
                    width: '50%',
                    children: right,
                } as ColumnElement,
            ],
        };

        wrapped.push(columnGroup);
        index = cursor;
    }

    return wrapped;
};
