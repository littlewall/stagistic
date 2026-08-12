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
import {
    formatBlockCycleShortcutLabel,
    formatLyricsToggleShortcutLabel,
} from '../../model/formatBlockShortcut';
import {
    getActiveScriptBlockFromState,
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

type EditorStatusBarSegment = {
    id: string,
    key: string,
    description: string,
};

const getLabel = (type: ScriptBlockNodeType) => labelByType.get(type) ?? type;

const getLyricsToggleTarget = (type: ScriptBlockNodeType): ScriptBlockNodeType | null => {
    if (type === 'dialogue') {
        return 'lyrics';
    }

    if (type === 'lyrics') {
        return 'dialogue';
    }

    return null;
};

export const getEditorStatusBarSegments = (
    activeType: ScriptBlockNodeType | null,
    blockNextElements: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>>,
): EditorStatusBarSegment[] => {
    if (!activeType) {
        return [];
    }

    const result: EditorStatusBarSegment[] = [];
    const nextType = blockNextElements[activeType];

    if (nextType) {
        result.push({
            id: 'enter',
            key: '⏎',
            description: getLabel(nextType),
        });
    }

    const lyricsToggleTarget = getLyricsToggleTarget(activeType);

    if (lyricsToggleTarget) {
        result.push({
            id: 'lyrics-toggle',
            key: formatLyricsToggleShortcutLabel(),
            description: `Switch to ${getLabel(lyricsToggleTarget).toLowerCase()}`,
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
    const activeType = useEditorState({
        editor,
        selector: ({editor: stateEditor}) => {
            if (!stateEditor) {
                return null;
            }

            if (isSelectionAcrossBlocks(stateEditor.state, SCRIPT_BLOCK_NODE_NAMES)) {
                return null;
            }

            const activeBlock = getActiveScriptBlockFromState(stateEditor.state, SCRIPT_BLOCK_NODE_NAMES);

            return activeBlock?.blockType ?? null;
        },
    });

    const segments = getEditorStatusBarSegments(activeType, blockNextElements);

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
