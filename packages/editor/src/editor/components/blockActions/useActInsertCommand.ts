import {
    createNodeId,
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    getDefaultActName,
    resolveScriptBlockNodeType,
} from '@stagistic/script';
import {TextSelection} from '@tiptap/pm/state';
import {type MouseEvent as ReactMouseEvent, useCallback} from 'react';

import {
    FOUNTAIN_BLOCK_NODE_NAME,
    isFountainBlockNodeName,
} from '../../tiptap/fountainCore';
import type {UseActInsertCommandArgs} from './types';

export const useActInsertCommand = ({
    editor,
    activeBlockId,
    closeMenu,
}: UseActInsertCommandArgs) => {
    const resolveSceneAnchorBlockId = useCallback((blockId: string) => {
        if (!editor) {
            return null;
        }

        const orderedBlocks: Array<{id: string, blockType: unknown}> = [];

        editor.state.doc.descendants(node => {
            if (!isFountainBlockNodeName(node.type.name)) {
                return true;
            }

            const id = typeof node.attrs.id === 'string' ? node.attrs.id : '';

            if (id) {
                orderedBlocks.push({
                    id,
                    blockType: node.attrs.blockType,
                });
            }

            return false;
        });

        if (orderedBlocks.length === 0) {
            return blockId;
        }

        const activeIndex = orderedBlocks.findIndex(block => block.id === blockId);

        if (activeIndex < 0) {
            const firstScene = orderedBlocks.find(block => block.blockType === ELEMENT_SCENE_HEADING);

            return firstScene?.id ?? blockId;
        }

        for (let index = activeIndex; index >= 0; index -= 1) {
            if (orderedBlocks[index].blockType === ELEMENT_SCENE_HEADING) {
                return orderedBlocks[index].id;
            }
        }

        for (let index = activeIndex + 1; index < orderedBlocks.length; index += 1) {
            if (orderedBlocks[index].blockType === ELEMENT_SCENE_HEADING) {
                return orderedBlocks[index].id;
            }
        }

        return blockId;
    }, [editor]);

    const countActBlocks = useCallback(() => {
        if (!editor) {
            return 0;
        }

        let count = 0;

        editor.state.doc.descendants(node => {
            if (!isFountainBlockNodeName(node.type.name)) {
                return true;
            }

            if (node.attrs.blockType === ELEMENT_ACT) {
                count += 1;
            }

            return false;
        });

        return count;
    }, [editor]);

    const insertActBeforeBlock = useCallback((blockId: string, name: string) => {
        if (!editor) {
            return;
        }

        let targetPos: number | null = null;
        let targetNodeTypeName: string | null = null;

        editor.state.doc.descendants((node, pos) => {
            if (!isFountainBlockNodeName(node.type.name)) {
                return true;
            }

            if (node.attrs.id === blockId) {
                targetPos = pos;
                targetNodeTypeName = node.type.name;

                return false;
            }

            return false;
        });

        if (targetPos === null) {
            return;
        }

        const nextActNodeTypeName = targetNodeTypeName === FOUNTAIN_BLOCK_NODE_NAME
            ? FOUNTAIN_BLOCK_NODE_NAME
            : resolveScriptBlockNodeType(ELEMENT_ACT) ?? FOUNTAIN_BLOCK_NODE_NAME;
        const blockNodeType = editor.state.schema.nodes[nextActNodeTypeName];

        if (!blockNodeType) {
            return;
        }

        const actNode = blockNodeType.create(
            {
                id: createNodeId(),
                blockType: ELEMENT_ACT,
            },
            editor.state.schema.text(name),
        );
        let tr = editor.state.tr.insert(targetPos, actNode);
        const selectionPos = (targetPos as number) + 1;

        tr = tr.setSelection(TextSelection.near(tr.doc.resolve(selectionPos), 1));
        editor.view.dispatch(tr.scrollIntoView());
        editor.view.focus();
    }, [editor]);

    return useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();

        if (!editor || !activeBlockId) {
            return;
        }

        const fallbackName = getDefaultActName(countActBlocks() + 1);
        const anchorBlockId = resolveSceneAnchorBlockId(activeBlockId);

        if (!anchorBlockId) {
            return;
        }

        insertActBeforeBlock(anchorBlockId, fallbackName);
    }, [
        activeBlockId,
        closeMenu,
        countActBlocks,
        editor,
        insertActBeforeBlock,
        resolveSceneAnchorBlockId,
    ]);
};
