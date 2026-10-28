import type {ScriptBlockIndexSnapshot} from '@stagistic/script';
import {
    useCallback,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {DragEndEvent, DragOverEvent} from '../editor/structure/types';
import {
    applyBoardOrder,
    type BoardOrder,
    findBoardPlacement,
    moveInBoardOrder,
    toBoardOrder,
} from './boardDragOrder';
import {resolveBoardInsertionTarget} from './boardInsertionTargets';
import {DEFAULT_ACT_KEY, type WallAct} from './buildWallView';

/*
 * While a scene is dragged, the Wall reorders its cards in React state, so the others make
 * room and the dragged card's placeholder stands where it would land. The document moves
 * the scene only on drop; a cancelled drag simply forgets the order.
 */
export const useBoardSceneDnd = ({
    acts,
    index,
    moveScene,
}: {
    acts: readonly WallAct[],
    index: ScriptBlockIndexSnapshot,
    moveScene: (id: string, beforeBlockId: string | null) => boolean,
}) => {
    const [order, setOrder] = useState<BoardOrder | null>(null);
    const orderRef = useRef<BoardOrder | null>(null);
    const updateOrder = useCallback((next: BoardOrder | null) => {
        orderRef.current = next;
        setOrder(next);
    }, []);

    const onDragStart = useCallback(() => updateOrder(toBoardOrder(acts)), [acts, updateOrder]);

    const onDragOver = useCallback((event: DragOverEvent) => {
        // React owns the order; dnd-kit must not move the cards' DOM between act lists itself.
        event.preventDefault();

        const {source, target} = event.operation;
        const current = orderRef.current;

        if (!source || !target || !current) return;

        const next = moveInBoardOrder(current, String(source.id), String(target.id));

        if (next !== current) updateOrder(next);
    }, [updateOrder]);

    const onDragEnd = useCallback((event: DragEndEvent) => {
        const sourceId = event.operation.source ? String(event.operation.source.id) : null;
        const placement = sourceId && orderRef.current ? findBoardPlacement(orderRef.current, sourceId) : null;
        const original = sourceId ? findBoardPlacement(toBoardOrder(acts), sourceId) : null;

        if (event.canceled || !sourceId || !placement
            || (placement.group === original?.group && placement.beforeSceneId === original.beforeSceneId)) {
            updateOrder(null);

            return;
        }

        const target = resolveBoardInsertionTarget(index, placement.group === DEFAULT_ACT_KEY ? null : placement.group, placement.beforeSceneId);

        // After dnd-kit finishes the drop; until then the dragged order stays on screen.
        window.setTimeout(() => {
            const moved = target ? moveScene(sourceId, target.beforeBlockId) : false;

            updateOrder(null);

            if (moved) {
                requestAnimationFrame(() => {
                    [...document.querySelectorAll<HTMLElement>('[data-board-card-id]')]
                        .find(card => card.dataset.boardCardId === sourceId)?.focus();
                });
            }
        }, 0);
    }, [
        acts,
        index,
        moveScene,
        updateOrder,
    ]);

    const shownActs = useMemo(() => applyBoardOrder(acts, order), [acts, order]);

    return {
        acts: shownActs,
        isDragging: order !== null,
        onDragStart,
        onDragOver,
        onDragEnd,
    };
};
