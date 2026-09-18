import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {EditorMusicRemoveRequest} from '../../contracts';
import {musicRailPluginKey} from '../../tiptap/extensions/musicRail/MusicRailExtension';
import {useBlockActionsOverlayAnchor} from '../blockActions/useBlockActionsOverlayAnchor';
import {useOverlayPosition} from '../blockActions/useOverlayPosition';
import {
    createMusicRailMarkerController,
    createMusicRailRangeController,
    escapeMusicRailSelector,
    MUSIC_RAIL_MENU_OPEN_ATTRIBUTE,
    resolveMusicRailLeft,
} from './musicRailDom';
import {MusicRailMenu, type MusicRailMenuState} from './MusicRailMenu';
import styles from './MusicRangeOverlay.module.css';
import {useMusicRailDrag} from './useMusicRailDrag';

type MusicRangeOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    onOpenMusicManager?: (musicId: string) => void,
    onRequestRemoveMusic?: (request: EditorMusicRemoveRequest) => void,
};

const MusicRangeOverlay = ({
    editor,
    canvasRef,
    onOpenMusicManager,
    onRequestRemoveMusic,
}: MusicRangeOverlayProps) => {
    const [menu, setMenu] = useState<MusicRailMenuState | null>(null);
    const [railRevision, setRailRevision] = useState(0);
    // Read by the canvas click handler, which is bound once and cannot see state.
    const openMenuRef = useRef<MusicRailMenuState | null>(null);
    const {activeBlockState} = useOverlayPosition({
        editor,
        canvasRef,
        isMenuOpen: menu !== null,
    });
    const activeAnchorStyle = useBlockActionsOverlayAnchor({
        editor,
        canvasRef,
        visibleOverlayState: activeBlockState,
    });
    const railState = useMemo(() => {
        return editor ? musicRailPluginKey.getState(editor.state) : null;
    }, [editor, railRevision]);
    const activeBoundary = activeBlockState
        ? railState?.boundaries.find(boundary => boundary.blockId === activeBlockState.blockId) ?? null
        : null;
    const showActiveTrigger = activeBoundary?.markerKind === 'none' && activeBoundary.hasActions;
    const activeRailLeft = canvasRef.current ? resolveMusicRailLeft(canvasRef.current) : null;

    const handleDragStart = useCallback(() => {
        setMenu(null);
    }, []);

    const openMenuForTarget = useCallback((target: HTMLElement) => {
        const rect = target.getBoundingClientRect();

        setMenu({
            blockId: target.dataset.blockId ?? '',
            markerKind: target.dataset.markerKind ?? 'none',
            startMusicId: target.dataset.startMusicId ?? null,
            endMusicId: target.dataset.endMusicId ?? null,
            left: rect.left - 8,
            top: Math.max(8, Math.min(rect.top - 8, window.innerHeight - 280)),
        });
    }, []);

    useMusicRailDrag({
        editor,
        canvasRef,
        onDragStart: handleDragStart,
        previewClassName: styles.dropPreview,
        rangePreviewClassName: styles.dropRangePreview,
        targetClassName: styles.dropTarget,
    });

    useEffect(() => {
        openMenuRef.current = menu;
    }, [menu]);

    /*
     * Points the open menu back at the marker it belongs to. The menu is placed
     * at a fixed position away from the rail, so without this the link between
     * the two is left to the reader; it is cleared by the effect teardown, which
     * covers every way the menu closes.
     */
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !menu) {
            return undefined;
        }

        const marker = canvas.querySelector<HTMLElement>(
            `[data-music-rail-boundary="true"][data-block-id="${escapeMusicRailSelector(menu.blockId)}"]`,
        );

        marker?.setAttribute(MUSIC_RAIL_MENU_OPEN_ATTRIBUTE, 'true');

        return () => {
            marker?.removeAttribute(MUSIC_RAIL_MENU_OPEN_ATTRIBUTE);
        };
    }, [canvasRef, menu]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return undefined;
        }

        const findRailPoint = (eventTarget: EventTarget | null) => {
            return eventTarget instanceof Element
                ? eventTarget.closest<HTMLElement>('[data-music-rail-boundary="true"]')
                : null;
        };
        const handleClick = (event: MouseEvent) => {
            const target = findRailPoint(event.target);

            if (!target) {
                return;
            }

            event.preventDefault();

            // Second click on the point that owns the open menu dismisses it.
            if (openMenuRef.current?.blockId === target.dataset.blockId) {
                setMenu(null);

                return;
            }

            openMenuForTarget(target);
        };
        const closeMenu = () => setMenu(null);
        const handlePointerDown = (event: PointerEvent) => {
            /*
             * A rail point decides for itself on click — open, switch or toggle
             * shut. Dismissing here instead would also drop the active block's
             * trigger, which only exists while something is open: it would be
             * unmounted between this pointerdown and its own click, and the
             * click the reader aimed at would land on nothing.
             */
            if (findRailPoint(event.target)) {
                return;
            }

            closeMenu();
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeMenu();
            }
        };

        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('scroll', closeMenu, {passive: true});
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('scroll', closeMenu);
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        canvasRef,
        editor,
        openMenuForTarget,
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            return undefined;
        }

        const markerController = createMusicRailMarkerController(editor, canvas, styles.boundary);
        const rangeController = createMusicRailRangeController(canvas, styles.range);
        let frame: number | null = null;
        let rebuildCount = musicRailPluginKey.getState(editor.state)?.rebuildCount ?? 0;
        const refresh = () => {
            frame = null;

            const state = musicRailPluginKey.getState(editor.state);

            markerController.show(state?.boundaries ?? []);
            rangeController.show(state?.snapshot.music ?? []);
        };
        const scheduleRefresh = () => {
            if (frame !== null) {
                return;
            }

            frame = window.requestAnimationFrame(refresh);
        };
        const handleTransaction = () => {
            const nextRebuildCount = musicRailPluginKey.getState(editor.state)?.rebuildCount ?? 0;

            if (nextRebuildCount === rebuildCount) {
                return;
            }

            rebuildCount = nextRebuildCount;
            setRailRevision(nextRebuildCount);
            scheduleRefresh();
        };
        const resizeObserver = new ResizeObserver(scheduleRefresh);

        resizeObserver.observe(editor.view.dom);
        editor.on('transaction', handleTransaction);
        window.addEventListener('resize', scheduleRefresh);
        setRailRevision(rebuildCount);
        scheduleRefresh();

        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }

            resizeObserver.disconnect();
            editor.off('transaction', handleTransaction);
            window.removeEventListener('resize', scheduleRefresh);
            markerController.clear();
            rangeController.clear();
        };
    }, [canvasRef, editor]);

    const snapshot = railState?.snapshot ?? null;

    return (
        <>
            {showActiveTrigger && activeBlockState && activeAnchorStyle && activeRailLeft !== null ? (
                <div
                    className={styles.activeTriggerAnchor}
                    data-block-actions-overlay="true"
                    style={{...activeAnchorStyle, left: `${activeRailLeft}px`}}
                >
                    <button
                        type="button"
                        className={styles.activeTrigger}
                        aria-label="Music actions"
                        data-music-rail-active-trigger="true"
                        data-music-rail-boundary="true"
                        data-block-id={activeBlockState.blockId}
                        data-marker-kind="none"
                        onMouseDown={event => event.preventDefault()}
                    >
                        <span aria-hidden="true">•••</span>
                    </button>
                </div>
            ) : null}
            {editor && menu && snapshot ? (
                <MusicRailMenu
                    editor={editor}
                    menu={menu}
                    snapshot={snapshot}
                    onClose={() => setMenu(null)}
                    onOpenMusicManager={onOpenMusicManager}
                    onRequestRemoveMusic={onRequestRemoveMusic}
                />
            ) : null}
        </>
    );
};

export default MusicRangeOverlay;
