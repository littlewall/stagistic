import {
    ChevronDownIcon,
    IconButton,
    Tooltip,
} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useState,
} from 'react';

import {getSceneCollapseSnapshot} from '../../tiptap/extensions';
import {
    getActiveScriptBlockFromState,
    SCRIPT_BLOCK_DOM_ID_ATTRIBUTE,
} from '../../tiptap/scriptCore';
import styles from './SceneCollapseOverlay.module.css';

interface SceneCollapseOverlayProps {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
}

interface SceneCollapseOverlayItem {
    sceneBlockId: string,
    isCollapsed: boolean,
    isActive: boolean,
    buttonLeft: number,
    buttonTop: number,
    summaryLeft: number,
    summaryTop: number,
}

const parseLength = (value: string, fallback: number) => {
    const parsed = Number.parseFloat(value);

    return Number.isFinite(parsed) ? parsed : fallback;
};

const escapeSelector = (value: string) => CSS.escape(value);

export const SceneCollapseOverlay = ({
    editor,
    canvasRef,
}: SceneCollapseOverlayProps) => {
    const [items, setItems] = useState<readonly SceneCollapseOverlayItem[]>([]);
    const [canvas, setCanvas] = useState<HTMLElement | null>(null);

    /*
     * The canvas ref belongs to this overlay's parent, so it is still empty
     * while the overlay's own layout effect runs on mount. A passive effect
     * runs after the whole tree is committed, which is the first moment the
     * element is there to measure and observe.
     */
    useEffect(() => {
        setCanvas(canvasRef.current);
    }, [canvasRef]);

    const updateItems = useCallback(() => {
        if (!editor || !canvas) {
            setItems([]);

            return;
        }

        const snapshot = getSceneCollapseSnapshot(editor.state);
        const collapsedIds = new Set(snapshot.collapsedSceneIds);
        const activeBlock = getActiveScriptBlockFromState(editor.state);
        const canvasRect = canvas.getBoundingClientRect();
        const nextItems = snapshot.ranges.flatMap(range => {
            if (range.bodyBlocks.length === 0) {
                return [];
            }

            const selector = `[${SCRIPT_BLOCK_DOM_ID_ATTRIBUTE}='${escapeSelector(range.sceneBlockId)}']`;
            const heading = editor.view.dom.querySelector<HTMLElement>(selector);

            if (!heading) {
                return [];
            }

            const headingRect = heading.getBoundingClientRect();
            const computed = window.getComputedStyle(heading);
            const marginLeft = parseLength(computed.getPropertyValue('--editor-margin-left'), 96);
            const markerWidth = parseLength(computed.getPropertyValue('--scene-marker-width'), 4);
            const paddingTop = parseLength(computed.paddingTop, 0);
            const lineHeight = parseLength(computed.lineHeight, 22);
            const contentTop = headingRect.top - canvasRect.top + canvas.scrollTop + paddingTop;
            const contentLeft = headingRect.left - canvasRect.left + canvas.scrollLeft;

            return [
                {
                    sceneBlockId: range.sceneBlockId,
                    isCollapsed: collapsedIds.has(range.sceneBlockId),
                    isActive: activeBlock?.id === range.sceneBlockId,
                    buttonLeft: contentLeft - marginLeft + markerWidth + 4,
                    buttonTop: contentTop + lineHeight / 2,
                    summaryLeft: contentLeft,
                    summaryTop: contentTop + lineHeight,
                },
            ];
        });

        setItems(nextItems);
    }, [canvas, editor]);

    useLayoutEffect(() => {
        if (!editor || !canvas) {
            return;
        }

        let frame: number | null = null;
        const scheduleUpdate = () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }

            frame = window.requestAnimationFrame(() => {
                frame = null;
                updateItems();
            });
        };
        const observer = new ResizeObserver(scheduleUpdate);

        updateItems();
        editor.on('transaction', scheduleUpdate);
        canvas.addEventListener('scroll', scheduleUpdate, {passive: true});
        window.addEventListener('resize', scheduleUpdate);
        observer.observe(canvas);
        observer.observe(editor.view.dom);

        return () => {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
            }

            editor.off('transaction', scheduleUpdate);
            canvas.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            observer.disconnect();
        };
    }, [
        canvas,
        editor,
        updateItems,
    ]);

    if (!editor || items.length === 0) {
        return null;
    }

    return (
        <div className={styles.layer} data-scene-collapse-overlay="true">
            {items.map(item => {
                const isVisible = item.isCollapsed || item.isActive;

                return (
                    <div key={item.sceneBlockId}>
                        <div
                            className={styles.item}
                            data-scene-collapse-item="true"
                            data-visible={isVisible ? 'true' : 'false'}
                            style={{
                                left: `${item.buttonLeft}px`,
                                top: `${item.buttonTop}px`,
                            }}
                        >
                            <Tooltip label={item.isCollapsed ? 'Expand scene' : 'Collapse scene'}>
                                <IconButton
                                    className={styles.trigger}
                                    variant="ghost"
                                    size="xs"
                                    aria-label="Scene content"
                                    aria-expanded={!item.isCollapsed}
                                    data-scene-collapse-trigger="true"
                                    data-scene-id={item.sceneBlockId}
                                    isSelected={item.isCollapsed}
                                    onPress={() => editor.commands.toggleSceneCollapsed(item.sceneBlockId)}
                                >
                                    <ChevronDownIcon
                                        className={item.isCollapsed ? styles.chevronCollapsed : undefined}
                                        aria-hidden="true"
                                    />
                                </IconButton>
                            </Tooltip>
                        </div>
                        {item.isCollapsed ? (
                            <span
                                className={styles.summary}
                                data-scene-collapse-summary={item.sceneBlockId}
                                style={{
                                    left: `${item.summaryLeft}px`,
                                    top: `${item.summaryTop}px`,
                                }}
                            >
                                Scene content is collapsed
                            </span>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
};
