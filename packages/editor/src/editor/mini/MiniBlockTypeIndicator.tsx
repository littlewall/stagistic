import type {Editor} from '@tiptap/core';
import {
    type RefObject,
    useCallback,
    useLayoutEffect,
    useState,
} from 'react';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {resolveBlockFirstLineCenter} from '../components/blockActions/useBlockActionsOverlayAnchor';
import {
    type BlockNodeType,
    getActiveScriptBlockFromState,
    normalizeBlockNodeType,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../tiptap/scriptCore';
import styles from './MiniScriptEditor.module.css';

type IndicatorState = {
    blockType: BlockNodeType,
    top: number,
};

type MiniBlockTypeIndicatorProps = {
    editor: Editor,
    rootRef: RefObject<HTMLDivElement | null>,
};

export const MiniBlockTypeIndicator = ({
    editor,
    rootRef,
}: MiniBlockTypeIndicatorProps) => {
    const [state, setState] = useState<IndicatorState | null>(null);
    const updateFromBlock = useCallback((block: HTMLElement) => {
        const root = rootRef.current;

        if (!root) {
            return;
        }

        setState({
            blockType: normalizeBlockNodeType(block.getAttribute('blocktype')),
            top: resolveBlockFirstLineCenter(root, block),
        });
    }, [rootRef]);
    const update = useCallback(() => {
        const root = rootRef.current;
        const activeBlock = getActiveScriptBlockFromState(
            editor.state,
            SCRIPT_BLOCK_NODE_NAMES,
        );

        if (!root || !activeBlock) {
            setState(null);

            return;
        }

        const blockDom = editor.view.nodeDOM(activeBlock.pos);
        const block = blockDom instanceof HTMLElement
            ? blockDom.closest<HTMLElement>('p[blocktype]')
            : null;

        if (!block || !root.contains(block)) {
            setState(null);

            return;
        }

        updateFromBlock(block);
    }, [
        editor,
        rootRef,
        updateFromBlock,
    ]);

    useLayoutEffect(() => {
        const root = rootRef.current;
        const resizeObserver = new ResizeObserver(update);
        const handlePointerDown = (event: Event) => {
            const target = event.target;

            if (!(target instanceof Element)) {
                return;
            }

            const block = target.closest<HTMLElement>('p[blocktype]');

            if (block && root?.contains(block)) {
                updateFromBlock(block);
            }
        };

        editor.on('focus', update);
        editor.on('blur', update);
        editor.on('selectionUpdate', update);
        editor.on('transaction', update);
        root?.addEventListener('mousedown', handlePointerDown);
        root?.addEventListener('pointerdown', handlePointerDown);
        root?.addEventListener('scroll', update, {passive: true});

        if (root) {
            resizeObserver.observe(root);
        }

        update();

        return () => {
            resizeObserver.disconnect();
            editor.off('focus', update);
            editor.off('blur', update);
            editor.off('selectionUpdate', update);
            editor.off('transaction', update);
            root?.removeEventListener('mousedown', handlePointerDown);
            root?.removeEventListener('pointerdown', handlePointerDown);
            root?.removeEventListener('scroll', update);
        };
    }, [
        editor,
        rootRef,
        update,
        updateFromBlock,
    ]);

    if (!state) {
        return null;
    }

    return (
        <span
            aria-hidden="true"
            className={styles.blockIndicator}
            data-mini-block-indicator
            style={{top: state.top}}
        >
            {BLOCK_ICONS[state.blockType]}
        </span>
    );
};
