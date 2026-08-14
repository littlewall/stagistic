import {type ScriptBlockNodeType} from '@stagistic/script';
import {
    Button,
    ModalDialog,
    PublicPreviewNotice,
} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEditorState} from '@tiptap/react';
import {useState} from 'react';

import {BLOCKS, BLOCKS_WITHOUT_ACT} from '../../blocks/blockRegistry';
import {getBlockQuickToggleTarget} from '../../model/blockQuickToggle';
import {
    formatBlockCycleShortcutLabel,
    formatBlockQuickToggleShortcutLabel,
    formatShiftEnterShortcutLabel,
} from '../../model/formatBlockShortcut';
import {
    getActiveScriptBlockFromState,
    isScriptBlockContentEmpty,
    isSelectionAcrossBlocks,
    SCRIPT_BLOCK_NODE_NAMES,
} from '../../tiptap/scriptCore';
import styles from './EditorStatusBar.module.css';

interface EditorStatusBarProps {
    editor: TiptapEditor | null,
    blockNextElements: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>>,
}

const CYCLE_TYPES = BLOCKS_WITHOUT_ACT.map(block => block.type);
const labelByType = new Map(BLOCKS.map(block => [block.type, block.label]));
const DIALOGUE_LIKE_TYPES: ReadonlySet<ScriptBlockNodeType> = new Set(['dialogue', 'lyrics']);

type EditorStatusBarSegment = {
    id: string,
    key: string,
    description: string,
};

const getLabel = (type: ScriptBlockNodeType) => labelByType.get(type) ?? type;

export const getEditorStatusBarSegments = (
    activeType: ScriptBlockNodeType | null,
    blockNextElements: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>>,
    isActiveBlockEmpty: boolean,
): EditorStatusBarSegment[] => {
    if (!activeType) {
        return [];
    }

    const result: EditorStatusBarSegment[] = [];
    const nextType = isActiveBlockEmpty && DIALOGUE_LIKE_TYPES.has(activeType)
        ? 'character'
        : blockNextElements[activeType];

    if (nextType) {
        result.push({
            id: 'enter',
            key: '⏎',
            description: getLabel(nextType),
        });
    }

    if (DIALOGUE_LIKE_TYPES.has(activeType)) {
        result.push({
            id: 'shift-enter',
            key: formatShiftEnterShortcutLabel(),
            description: getLabel(activeType),
        });
    }

    const quickToggleTarget = getBlockQuickToggleTarget(activeType);

    if (quickToggleTarget) {
        result.push({
            id: 'quick-toggle',
            key: formatBlockQuickToggleShortcutLabel(),
            description: `Switch to ${getLabel(quickToggleTarget).toLowerCase()}`,
        });
    }

    if (activeType === 'act') {
        return result;
    }

    const cycleIndex = CYCLE_TYPES.indexOf(activeType);
    const nextCycleType = cycleIndex === -1
        ? undefined
        : CYCLE_TYPES[(cycleIndex + 1) % CYCLE_TYPES.length];

    if (nextCycleType) {
        result.push({
            id: 'cycle',
            key: formatBlockCycleShortcutLabel(),
            description: `Change type (${getLabel(nextCycleType).toLowerCase()})`,
        });
    }

    return result;
};

export const EditorStatusBar = ({
    editor,
    blockNextElements,
}: EditorStatusBarProps) => {
    const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
    const activeBlockStatus = useEditorState({
        editor,
        selector: ({editor: stateEditor}) => {
            if (!stateEditor) {
                return null;
            }

            if (isSelectionAcrossBlocks(stateEditor.state, SCRIPT_BLOCK_NODE_NAMES)) {
                return null;
            }

            const activeBlock = getActiveScriptBlockFromState(stateEditor.state, SCRIPT_BLOCK_NODE_NAMES);

            if (!activeBlock) {
                return null;
            }

            return {
                type: activeBlock.blockType,
                isEmpty: isScriptBlockContentEmpty(activeBlock.node),
            };
        },
        equalityFn: (previous, next) => previous?.type === next?.type
            && previous?.isEmpty === next?.isEmpty,
    });

    const segments = getEditorStatusBarSegments(
        activeBlockStatus?.type ?? null,
        blockNextElements,
        activeBlockStatus?.isEmpty ?? false,
    );

    return (
        <>
            <div className={styles.statusBar}>
                <div className={styles.center}>
                    {segments.map(segment => (
                        <span className={styles.segment} key={segment.id}>
                            <span className={styles.segmentKey}>{segment.key}</span>
                            <span>{segment.description}</span>
                        </span>
                    ))}
                </div>
                <div className={styles.right}>
                    <Button
                        aria-label="What does public preview mean?"
                        className={styles.previewLink}
                        size="icon"
                        variant="ghost"
                        onPress={() => setIsPreviewDialogOpen(true)}
                    >
                        Public preview
                    </Button>
                    <a className={styles.feedbackLink} href="mailto:feedback@stagistic.com">
                        feedback@stagistic.com
                    </a>
                </div>
            </div>
            <ModalDialog
                ariaLabel="About the public preview"
                isOpen={isPreviewDialogOpen}
                onClose={() => setIsPreviewDialogOpen(false)}
            >
                <PublicPreviewNotice />
                <div className={styles.modalActions}>
                    <Button
                        variant="secondary"
                        onPress={() => setIsPreviewDialogOpen(false)}
                    >
                        Close
                    </Button>
                </div>
            </ModalDialog>
        </>
    );
};
