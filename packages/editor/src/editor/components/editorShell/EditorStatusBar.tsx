import {type ScriptBlockNodeType} from '@stagistic/script';
import {AppFooter} from '@stagistic/ui';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEditorState} from '@tiptap/react';

import {BLOCKS, BLOCKS_WITHOUT_ACT} from '../../blocks/blockRegistry';
import {getBlockQuickToggleTarget} from '../../model/blockQuickToggle';
import {type EnterHintBlockState, resolveEnterHint} from '../../model/enterHint';
import {
    formatBlockCycleShortcutLabel,
    formatBlockQuickToggleShortcutLabel,
    formatShiftEnterShortcutLabel,
    formatTabShortcutLabel,
} from '../../model/formatBlockShortcut';
import {resolveAsideFlowTarget, resolveAsideToggleTarget} from '../../tiptap/scriptBlock/handlers/tab';
import {getActiveScriptBlockFromState, isScriptBlockContentEmpty, isSelectionAcrossBlocks, SCRIPT_BLOCK_NODE_NAMES} from '../../tiptap/scriptCore';

import styles from './EditorStatusBar.module.css';

interface EditorStatusBarProps {
    editor: TiptapEditor | null;
    blockNextElements: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>>;
}

const CYCLE_TYPES = BLOCKS_WITHOUT_ACT.map(block => block.type);
const labelByType = new Map(BLOCKS.map(block => [block.type, block.label]));
const DIALOGUE_LIKE_TYPES: ReadonlySet<ScriptBlockNodeType> = new Set(['dialogue', 'lyrics']);

type EditorStatusBarSegment = {
    id: string;
    key: string;
    description: string;
};

export interface EditorStatusBarBlockState extends EnterHintBlockState {
    asideToggleTarget: ScriptBlockNodeType | null;
}

const getLabel = (type: ScriptBlockNodeType) => labelByType.get(type) ?? type;

export const getEditorStatusBarSegments = (
    activeType: ScriptBlockNodeType | null,
    blockNextElements: Partial<Record<ScriptBlockNodeType, ScriptBlockNodeType>>,
    blockState: EditorStatusBarBlockState,
): EditorStatusBarSegment[] => {
    if (!activeType) {
        return [];
    }

    const result: EditorStatusBarSegment[] = [];
    const enterHint = resolveEnterHint(activeType, blockNextElements, blockState);
    const enterDescription = enterHint.kind === 'chooser' ? 'Choose type' : getLabel(enterHint.blockType);

    result.push({
        id: 'enter',
        key: '⏎',
        description: enterDescription,
    });

    /*
     * Shift+Enter always continues the current block type, so for a block
     * whose next element is itself (lyrics, by default) it duplicates the
     * plain Enter hint. Only advertise the simpler chord in that case.
     */
    if (DIALOGUE_LIKE_TYPES.has(activeType) && getLabel(activeType) !== enterDescription) {
        result.push({
            id: 'shift-enter',
            key: formatShiftEnterShortcutLabel(),
            description: getLabel(activeType),
        });
    }

    if (blockState.asideToggleTarget) {
        result.push({
            id: 'aside-toggle',
            key: formatTabShortcutLabel(),
            description: `Switch to ${getLabel(blockState.asideToggleTarget).toLowerCase()}`,
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
    const nextCycleType = cycleIndex === -1 ? undefined : CYCLE_TYPES[(cycleIndex + 1) % CYCLE_TYPES.length];

    if (nextCycleType) {
        result.push({
            id: 'cycle',
            key: formatBlockCycleShortcutLabel(),
            description: `Change type (${getLabel(nextCycleType).toLowerCase()})`,
        });
    }

    return result;
};

export const EditorStatusBar = ({editor, blockNextElements}: EditorStatusBarProps) => {
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

            /*
             * Same emptiness/caret rules the Enter handler uses (see
             * createBlockContext) so the hints can't promise something other
             * than what the key press does.
             */
            const {selection} = stateEditor.state;
            const isCollapsed = selection.empty;
            const isEmpty = isScriptBlockContentEmpty(activeBlock.node);

            return {
                type: activeBlock.blockType,
                isEmpty,
                hasOnlyNonTextContent: !isEmpty && (activeBlock.node.textContent ?? '').trim().length === 0,
                isAtStart: isCollapsed && selection.from === activeBlock.from,
                isAtEnd: isCollapsed && selection.from === activeBlock.to,
                asideFlowTarget: activeBlock.blockType === 'aside' ? resolveAsideFlowTarget(stateEditor.state.doc, activeBlock.pos) : null,
                asideToggleTarget: resolveAsideToggleTarget(stateEditor.state.doc, activeBlock.blockType, activeBlock.pos),
            };
        },
        equalityFn: (previous, next) =>
            previous?.type === next?.type &&
            previous?.isEmpty === next?.isEmpty &&
            previous?.hasOnlyNonTextContent === next?.hasOnlyNonTextContent &&
            previous?.isAtStart === next?.isAtStart &&
            previous?.isAtEnd === next?.isAtEnd &&
            previous?.asideFlowTarget === next?.asideFlowTarget &&
            previous?.asideToggleTarget === next?.asideToggleTarget,
    });

    const segments = getEditorStatusBarSegments(activeBlockStatus?.type ?? null, blockNextElements, {
        isEmpty: activeBlockStatus?.isEmpty ?? false,
        hasOnlyNonTextContent: activeBlockStatus?.hasOnlyNonTextContent ?? false,
        isAtStart: activeBlockStatus?.isAtStart ?? false,
        isAtEnd: activeBlockStatus?.isAtEnd ?? false,
        asideFlowTarget: activeBlockStatus?.asideFlowTarget ?? null,
        asideToggleTarget: activeBlockStatus?.asideToggleTarget ?? null,
    });

    return (
        <AppFooter>
            {segments.map(segment => (
                <span className={styles.segment} key={segment.id}>
                    <span className={styles.segmentKey}>{segment.key}</span>
                    <span>{segment.description}</span>
                </span>
            ))}
        </AppFooter>
    );
};
