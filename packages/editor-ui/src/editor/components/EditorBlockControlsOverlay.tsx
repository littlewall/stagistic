import {useEditorRef} from 'platejs/react';
import type {CSSProperties, RefObject} from 'react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import BlockControls from '../blocks/controls/BlockControls';
import {
    useEditorActiveBlock,
    useEditorActivityState,
    useEditorSelectionState,
} from '../state/EditorStateProvider';
import styles from './EditorBlockControlsOverlay.module.css';

type EditorBlockControlsOverlayProps = {
    canvasRef: RefObject<HTMLElement | null>,
};

const nodeToDOMCache = new WeakMap<object, HTMLElement>();

const EditorBlockControlsOverlay = ({canvasRef}: EditorBlockControlsOverlayProps) => {
    const editor = useEditorRef();
    const {activeBlockPath, activeBlockInfo} = useEditorActiveBlock();
    const {isEditorActive} = useEditorActivityState();
    const {isMultiBlockSelection, selection} = useEditorSelectionState();
    const [overlayStyle, setOverlayStyle] = useState<CSSProperties | null>(null);
    const targetElementRef = useRef<HTMLElement | null>(null);

    const updatePosition = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas || !activeBlockPath) {
            setOverlayStyle(null);
            targetElementRef.current = null;

            return;
        }

        try {
            const entry = editor.api.node(activeBlockPath);

            if (!entry) {
                setOverlayStyle(null);
                targetElementRef.current = null;

                return;
            }

            const [node] = entry;

            // Try to get from cache first
            let target = nodeToDOMCache.get(node);

            // If not in cache, find it
            if (!target || !canvas.contains(target)) {
                const pathKey = activeBlockPath.join(',');
                const allElements = canvas.querySelectorAll<HTMLElement>('[data-slate-node="element"]');

                for (const el of allElements) {
                    const slateNode = (el as any).__slateNode;

                    if (slateNode) {
                        const nodePath = editor.api.path(slateNode);

                        if (nodePath && nodePath.join(',') === pathKey) {
                            target = el;
                            nodeToDOMCache.set(node, el);
                            break;
                        }
                    }
                }
            }

            if (!target) {
                setOverlayStyle(null);
                targetElementRef.current = null;

                return;
            }

            targetElementRef.current = target;

            const canvasRect = canvas.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const top = targetRect.top - canvasRect.top + canvas.scrollTop;
            const left = targetRect.left - canvasRect.left + canvas.scrollLeft;

            setOverlayStyle({
                top,
                left,
                width: targetRect.width,
                height: targetRect.height,
            });
        } catch {
            setOverlayStyle(null);
            targetElementRef.current = null;
        }
    }, [
        activeBlockPath,
        canvasRef,
        editor,
    ]);

    useLayoutEffect(() => {
        updatePosition();
    }, [
        updatePosition,
        selection,
        activeBlockInfo,
        isEditorActive,
    ]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const handleUpdate = () => updatePosition();
        const resizeObserver = new ResizeObserver(handleUpdate);

        canvas.addEventListener('scroll', handleUpdate);
        window.addEventListener('resize', handleUpdate);
        resizeObserver.observe(canvas);

        // Observe the target element if available
        if (targetElementRef.current) {
            resizeObserver.observe(targetElementRef.current);
        }

        return () => {
            canvas.removeEventListener('scroll', handleUpdate);
            window.removeEventListener('resize', handleUpdate);
            resizeObserver.disconnect();
        };
    }, [canvasRef, updatePosition]);

    if (
        !isEditorActive ||
        !selection ||
        isMultiBlockSelection ||
        !activeBlockInfo ||
        !activeBlockPath ||
        !overlayStyle
    ) {
        return null;
    }

    const pathString = activeBlockPath.join('-');

    return (
        <div className={styles.overlay} style={overlayStyle}>
            <div className={styles.controlsWrapper}>
                <BlockControls
                    icon={activeBlockInfo.icon}
                    label={activeBlockInfo.label}
                    visible={true}
                    element={activeBlockInfo.element}
                    path={activeBlockInfo.path}
                    blockId={pathString}
                />
            </div>
        </div>
    );
};

export default EditorBlockControlsOverlay;
