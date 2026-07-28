import type {Editor as TiptapEditor} from '@tiptap/react';
import {type RefObject, useEffect} from 'react';

import {musicRailPluginKey} from '../../tiptap/extensions/musicRail/MusicRailExtension';
import {
    SCRIPT_BLOCK_DOM_ID_ATTRIBUTE,
    SCRIPT_BLOCK_DOM_SELECTOR,
} from '../../tiptap/scriptCore';
import {
    resolveMusicRailBlockTop,
    resolveMusicRailLeft,
} from './musicRailDom';
import {canDropMusicOutAtBoundary} from './musicRangeModel';

type MusicRailDragProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    onDragStart: () => void,
    previewClassName: string,
};

type DragSession = {
    pointerId: number,
    originX: number,
    originY: number,
    musicId: string | null,
    sourceBlockId: string,
    targetBlockId: string | null,
    preview: HTMLElement | null,
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

const clearPreview = (session: DragSession | null) => {
    if (session?.preview) {
        session.preview.remove();
        session.preview = null;
    }
};

const showPreview = (
    editor: TiptapEditor,
    canvas: HTMLElement,
    session: DragSession,
    blockId: string,
    className: string,
) => {
    if (session.targetBlockId === blockId && session.preview?.isConnected) {
        return;
    }

    const top = resolveMusicRailBlockTop(editor, canvas, blockId);

    clearPreview(session);

    if (top === null) {
        return;
    }

    const preview = document.createElement('span');

    preview.className = className;
    preview.dataset.musicRailDropPreview = 'true';
    preview.dataset.blockId = blockId;
    preview.style.left = `${resolveMusicRailLeft(canvas)}px`;
    preview.style.top = `${top}px`;
    preview.ariaHidden = 'true';
    canvas.appendChild(preview);
    session.preview = preview;
};

export const useMusicRailDrag = ({
    editor,
    canvasRef,
    onDragStart,
    previewClassName,
}: MusicRailDragProps) => {
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return undefined;
        }

        let session: DragSession | null = null;
        let suppressNextClick = false;

        const cancel = () => {
            clearPreview(session);
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
            session = {
                pointerId: event.pointerId,
                originX: event.clientX,
                originY: event.clientY,
                musicId,
                sourceBlockId: boundary.dataset.blockId ?? '',
                targetBlockId: null,
                preview: null,
                isDragging: false,
            };
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
                && canDropMusicOutAtBoundary(snapshot, session.musicId, targetBlockId),
            );

            if (isAllowed && targetBlockId) {
                showPreview(editor, canvas, session, targetBlockId, previewClassName);
            } else {
                clearPreview(session);
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
    ]);
};
