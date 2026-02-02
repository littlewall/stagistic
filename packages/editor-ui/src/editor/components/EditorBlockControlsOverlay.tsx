import type {CSSProperties, RefObject} from 'react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useState,
} from 'react';

import {
    useEditorActiveBlock,
    useEditorActivityState,
    useEditorSelectionState,
} from '../state/EditorStateProvider';
import BlockControls from '../blocks/controls/BlockControls';
import styles from './EditorBlockControlsOverlay.module.css';

type EditorBlockControlsOverlayProps = {
    canvasRef: RefObject<HTMLElement>,
};

const EditorBlockControlsOverlay = ({canvasRef}: EditorBlockControlsOverlayProps) => {
    const {activeBlockPathString, activeBlockInfo} = useEditorActiveBlock();
    const {isEditorActive} = useEditorActivityState();
    const {isMultiBlockSelection, selection} = useEditorSelectionState();
    const [overlayStyle, setOverlayStyle] = useState<CSSProperties | null>(null);

    const updatePosition = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas || !activeBlockPathString) {
            setOverlayStyle(null);

            return;
        }

        const target = canvas.querySelector<HTMLElement>(
            `[data-block-id="${activeBlockPathString}"]`,
        );

        if (!target) {
            setOverlayStyle(null);

            return;
        }

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
    }, [activeBlockPathString, canvasRef]);

    useLayoutEffect(() => {
        updatePosition();
    }, [updatePosition, selection, activeBlockInfo, isEditorActive]);

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

        if (activeBlockPathString) {
            const target = canvas.querySelector<HTMLElement>(
                `[data-block-id="${activeBlockPathString}"]`,
            );

            if (target) {
                resizeObserver.observe(target);
            }
        }

        return () => {
            canvas.removeEventListener('scroll', handleUpdate);
            window.removeEventListener('resize', handleUpdate);
            resizeObserver.disconnect();
        };
    }, [activeBlockPathString, canvasRef, updatePosition]);

    if (
        !isEditorActive ||
        !selection ||
        isMultiBlockSelection ||
        !activeBlockInfo ||
        !activeBlockPathString ||
        !overlayStyle
    ) {
        return null;
    }

    return (
        <div className={styles.overlay} style={overlayStyle}>
            <div className={styles.controlsWrapper}>
                <BlockControls
                    icon={activeBlockInfo.icon}
                    label={activeBlockInfo.label}
                    visible={true}
                    element={activeBlockInfo.element}
                    path={activeBlockInfo.path}
                    blockId={activeBlockPathString}
                />
            </div>
        </div>
    );
};

export default EditorBlockControlsOverlay;
