import type {Editor as TiptapEditor} from '@tiptap/react';
import {type RefObject, useEffect} from 'react';

import {musicRailPluginKey} from '../../tiptap/extensions/musicRail/MusicRailExtension';
import {
    SCRIPT_BLOCK_DOM_ID_ATTRIBUTE,
    SCRIPT_BLOCK_DOM_SELECTOR,
} from '../../tiptap/scriptCore';
import {
    createMusicRailDragView,
    isEligibleMusicRailDropTarget,
} from './musicRailDragDom';

type MusicRailDragProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    onDragStart: () => void,
    previewClassName: string,
    rangePreviewClassName: string,
    targetClassName: string,
};

type DragSession = {
    pointerId: number,
    originX: number,
    originY: number,
    musicId: string | null,
    sourceBlockId: string,
    targetBlockId: string | null,
    isDragging: boolean,
};

const getBoundary = (target: EventTarget | null) => {
    return target instanceof Element
        ? target.closest<HTMLElement>('[data-music-rail-boundary="true"]')
        : null;
};

const getBlockId = (target: Element | null) => {
    return target?.closest<HTMLElement>(SCRIPT_BLOCK_DOM_SELECTOR)
        ?.getAttribute(SCRIPT_BLOCK_DOM_ID_ATTRIBUTE) ?? null;
};

const resolveClosestBlockId = (canvas: HTMLElement, pointerClientY: number) => {
    let closestBlockId: string | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const block of canvas.querySelectorAll<HTMLElement>(SCRIPT_BLOCK_DOM_SELECTOR)) {
        const blockId = block.getAttribute(SCRIPT_BLOCK_DOM_ID_ATTRIBUTE);

        if (!blockId) {
            continue;
        }

        const rect = block.getBoundingClientRect();
        const distance = pointerClientY < rect.top
            ? rect.top - pointerClientY
            : Math.max(0, pointerClientY - rect.bottom);

        if (distance < closestDistance) {
            closestBlockId = blockId;
            closestDistance = distance;
        }
    }

    return closestBlockId;
};

export const useMusicRailDrag = ({
    editor,
    canvasRef,
    onDragStart,
    previewClassName,
    rangePreviewClassName,
    targetClassName,
}: MusicRailDragProps) => {
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return undefined;
        }

        let session: DragSession | null = null;
        let suppressNextClick = false;
        const dragView = createMusicRailDragView(editor, canvas, {
            dropPreview: previewClassName,
            eligibleTarget: targetClassName,
            rangePreview: rangePreviewClassName,
        });

        const cancel = () => {
            dragView.clear();
            session = null;
        };
        const handlePointerDown = (event: PointerEvent) => {
            const boundary = getBoundary(event.target);
            const isOrphan = boundary?.dataset.markerKind === 'orphan';
            const musicId = boundary?.dataset.endMusicId ?? null;

            if (event.button !== 0 || !boundary || (!musicId && !isOrphan)) {
                return;
            }

            boundary.setPointerCapture(event.pointerId);

            const sourceBlockId = boundary.dataset.blockId ?? '';
            const snapshot = musicRailPluginKey.getState(editor.state)?.snapshot;

            session = {
                pointerId: event.pointerId,
                originX: event.clientX,
                originY: event.clientY,
                musicId,
                sourceBlockId,
                targetBlockId: null,
                isDragging: false,
            };

            if (snapshot) {
                dragView.showEligibleTargets(snapshot, musicId, sourceBlockId);
            }
        };
        const handlePointerMove = (event: PointerEvent) => {
            if (!session || session.pointerId !== event.pointerId) {
                return;
            }

            const distance = Math.hypot(
                event.clientX - session.originX,
                event.clientY - session.originY,
            );

            if (!session.isDragging && distance < 5) {
                return;
            }

            if (!session.isDragging) {
                session.isDragging = true;
                onDragStart();
            }

            const elements = document.elementsFromPoint(event.clientX, event.clientY);
            const boundary = elements
                .map(element => getBoundary(element))
                .find(Boolean) ?? null;
            const targetBlockId = boundary?.dataset.blockId
                ?? elements.map(element => getBlockId(element)).find(Boolean)
                ?? resolveClosestBlockId(canvas, event.clientY);
            const snapshot = musicRailPluginKey.getState(editor.state)?.snapshot;
            const isAllowed = Boolean(
                snapshot
                && targetBlockId
                && isEligibleMusicRailDropTarget(
                    snapshot,
                    session.musicId,
                    session.sourceBlockId,
                    targetBlockId,
                ),
            );

            if (isAllowed && targetBlockId && snapshot) {
                dragView.showPreview(snapshot, session.musicId, targetBlockId);
            } else {
                dragView.clearPreview();
            }

            session.targetBlockId = isAllowed ? targetBlockId : null;

            const canvasRect = canvas.getBoundingClientRect();

            if (event.clientY < canvasRect.top + 32) {
                canvas.scrollTop -= 18;
            } else if (event.clientY > canvasRect.bottom - 32) {
                canvas.scrollTop += 18;
            }
        };
        const handlePointerUp = (event: PointerEvent) => {
            if (!session || session.pointerId !== event.pointerId) {
                return;
            }

            const completed = session;

            if (completed.isDragging && completed.targetBlockId) {
                if (completed.musicId) {
                    editor.commands.setMusicOutAtBlock(completed.targetBlockId);
                } else {
                    editor.commands.moveOrphanMusicOut(
                        completed.sourceBlockId,
                        completed.targetBlockId,
                    );
                }
            }

            suppressNextClick = completed.isDragging;
            cancel();
        };
        const handleClick = (event: MouseEvent) => {
            if (!suppressNextClick) {
                return;
            }

            suppressNextClick = false;
            event.preventDefault();
            event.stopImmediatePropagation();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && session) {
                cancel();
            }
        };

        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerUp);
        canvas.addEventListener('pointercancel', cancel);
        canvas.addEventListener('click', handleClick, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            cancel();
            canvas.removeEventListener('pointerdown', handlePointerDown);
            canvas.removeEventListener('pointermove', handlePointerMove);
            canvas.removeEventListener('pointerup', handlePointerUp);
            canvas.removeEventListener('pointercancel', cancel);
            canvas.removeEventListener('click', handleClick, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        canvasRef,
        editor,
        onDragStart,
        previewClassName,
        rangePreviewClassName,
        targetClassName,
    ]);
};
