import {
    createNodeId,
    ELEMENT_ACT,
    ELEMENT_SCENE_HEADING,
    getDefaultActName,
} from '@stagistic/script-core';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {type MouseEvent as ReactMouseEvent, useCallback} from 'react';

import {FOUNTAIN_BLOCK_NODE_NAME} from '../../tiptap/fountainCore';

type UseActInsertCommandArgs = {
    editor: TiptapEditor | null,
    activeBlockId: string | null,
    closeMenu: () => void,
};

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
            if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
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
            if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
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

        editor.state.doc.descendants((node, pos) => {
            if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
                return true;
            }

            if (node.attrs.id === blockId) {
                targetPos = pos;

                return false;
            }

            return false;
        });

        if (targetPos === null) {
            return;
        }

        const blockNodeType = editor.state.schema.nodes[FOUNTAIN_BLOCK_NODE_NAME];

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
