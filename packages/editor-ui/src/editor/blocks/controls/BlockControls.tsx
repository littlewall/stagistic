import {BlockMenuPlugin} from '@platejs/selection/react';
import type {FountainElement} from '@stagistic/editor-core';
import {
    useEditorRef,
} from 'platejs/react';
import {
    type MouseEvent as ReactMouseEvent,
    type ReactElement,
    useCallback,
    useRef,
} from 'react';
import {Path} from 'slate';

import styles from './BlockControls.module.css';
import BlockMenu from './BlockMenu';

type BlockControlsProps = {
    icon?: ReactElement,
    label: string,
    visible: boolean,
    element: FountainElement,
    path: Path,
    blockId: string,
};

const BlockControls = ({
    icon,
    label,
    visible,
    element,
    path,
    blockId,
}: BlockControlsProps) => {
    const editor = useEditorRef();
    const blockMenuApi = editor.getApi(BlockMenuPlugin).blockMenu;
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    const handleTriggerMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        blockMenuApi.show(blockId);
    }, [blockId, blockMenuApi]);

    return (
        <span className={styles.controls}>
            <button
                className={styles.trigger}
                type="button"
                aria-label={`Change block type (current: ${label})`}
                ref={triggerRef}
                onMouseDown={handleTriggerMouseDown}
                disabled={!visible}
            >
                <span className={styles.triggerIcon}>{icon}</span>
            </button>
            <BlockMenu
                blockId={blockId}
                element={element}
                path={path}
                triggerRef={triggerRef}
            />
        </span>
    );
};

export default BlockControls;
