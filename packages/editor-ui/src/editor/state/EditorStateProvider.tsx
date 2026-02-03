import {
    applyBlockTypeChange,
    type FountainBlockTypeChangeTarget,
} from '@stagistic/editor-core';
import {
    useEditorRef,
    useFocused,
    useSelectionVersion,
} from 'platejs/react';
import {
    createContext,
    type ReactElement,
    type ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {Path, Range} from 'slate';

import {BLOCK_ICONS} from '../blocks/controls/blockIcons';
import {FOUNTAIN_BLOCKS} from '../blocks/fountainBlockRegistry';

export type ActiveBlockInfo = {
    path: Path,
    element: FountainBlockTypeChangeTarget,
    type: string,
    icon: ReactElement,
    label: string,
} | null;

type EditorStateValue = {
    activeBlockPath: Path | null,
    activeBlockPathString: string | null,
    activeElement: FountainBlockTypeChangeTarget | null,
    activeBlockInfo: ActiveBlockInfo,
    canRedo: boolean,
    canUndo: boolean,
    isEditorActive: boolean,
    isMultiBlockSelection: boolean,
    selection: Range | null,
};

type EditorCommandsValue = {
    redo: () => void,
    setBlockType: (type: FountainBlockTypeChangeTarget['type']) => void,
    toggleMark: (key: 'bold' | 'italic' | 'underline') => void,
    undo: () => void,
};

type ActiveBlockValue = Pick<
    EditorStateValue,
'activeBlockPath' | 'activeBlockPathString' | 'activeElement' | 'activeBlockInfo'
>;

type SelectionValue = Pick<EditorStateValue, 'isMultiBlockSelection' | 'selection'>;

type ActivityValue = Pick<EditorStateValue, 'isEditorActive'>;

type HistoryValue = Pick<EditorStateValue, 'canRedo' | 'canUndo'>;

const EditorStateContext = createContext<EditorStateValue | null>(null);
const ActiveBlockContext = createContext<ActiveBlockValue | null>(null);
const SelectionContext = createContext<SelectionValue | null>(null);
const ActivityContext = createContext<ActivityValue | null>(null);
const HistoryContext = createContext<HistoryValue | null>(null);
const EditorCommandsContext = createContext<EditorCommandsValue | null>(null);

export const useEditorSessionState = () => {
    const context = useContext(EditorStateContext);

    if (!context) {
        throw new Error('useEditorSessionState must be used within EditorStateProvider');
    }

    return context;
};

export const useEditorActiveBlock = () => {
    const context = useContext(ActiveBlockContext);

    if (!context) {
        throw new Error('useEditorActiveBlock must be used within EditorStateProvider');
    }

    return context;
};

export const useEditorSelectionState = () => {
    const context = useContext(SelectionContext);

    if (!context) {
        throw new Error('useEditorSelectionState must be used within EditorStateProvider');
    }

    return context;
};

export const useEditorActivityState = () => {
    const context = useContext(ActivityContext);

    if (!context) {
        throw new Error('useEditorActivityState must be used within EditorStateProvider');
    }

    return context;
};

export const useEditorHistoryState = () => {
    const context = useContext(HistoryContext);

    if (!context) {
        throw new Error('useEditorHistoryState must be used within EditorStateProvider');
    }

    return context;
};

export const useEditorSessionCommands = () => {
    const context = useContext(EditorCommandsContext);

    if (!context) {
        throw new Error('useEditorSessionCommands must be used within EditorStateProvider');
    }

    return context;
};

export const useEditorState = () => useEditorSessionState();

type EditorStateProviderProps = {
    children: ReactNode,
};

export const EditorStateProvider = ({children}: EditorStateProviderProps) => {
    const editor = useEditorRef();
    const selectionVersion = useSelectionVersion();
    const isFocused = useFocused();

    const selection = editor.selection ?? null;

    const activeBlockEntry = useMemo(
        () => {
            if (!selection) return null;

            return editor.api.block({at: selection});
        },
        [editor, selectionVersion],
    );

    const activeBlockPath = activeBlockEntry?.[1] ?? null;
    const activeBlockPathString = activeBlockPath ? activeBlockPath.join('-') : null;
    const activeElement = (activeBlockEntry?.[0] ?? null) as FountainBlockTypeChangeTarget | null;

    // Compute active block info once for sharing between toolbar and block controls
    const activeBlockInfo = useMemo<ActiveBlockInfo>(() => {
        if (!activeElement || !activeBlockPath) return null;

        const type = activeElement.type;
        const option = FOUNTAIN_BLOCKS.find(opt => opt.type === type);

        return {
            path: activeBlockPath,
            element: activeElement,
            type,
            icon: BLOCK_ICONS[type],
            label: option?.label ?? 'Block',
        };
    }, [activeElement, activeBlockPath]);

    const isMultiBlockSelection = useMemo(() => {
        if (!selection || Range.isCollapsed(selection)) {
            return false;
        }

        const anchorBlock = editor.api.block({at: selection.anchor});
        const focusBlock = editor.api.block({at: selection.focus});

        if (!anchorBlock || !focusBlock) {
            return false;
        }

        return !Path.equals(anchorBlock[1], focusBlock[1]);
    }, [editor, selectionVersion]);

    // Only recompute history state when history arrays actually change length
    const undosLength = editor.history?.undos?.length ?? 0;
    const redosLength = editor.history?.redos?.length ?? 0;

    const canUndo = undosLength > 0;
    const canRedo = redosLength > 0;

    const [isEditorActive, setIsEditorActive] = useState(false);

    useEffect(() => {
        const updateActive = () => {
            const activeElement = document.activeElement;

            if (!(activeElement instanceof HTMLElement)) {
                setIsEditorActive(false);

                return;
            }

            const isInEditor = !!activeElement.closest('[data-slate-editor="true"]');
            const isInToolbar = !!activeElement.closest('[data-editor-toolbar="true"]');

            setIsEditorActive(isFocused || isInEditor || isInToolbar);
        };

        updateActive();

        document.addEventListener('focusin', updateActive);
        document.addEventListener('focusout', updateActive);

        return () => {
            document.removeEventListener('focusin', updateActive);
            document.removeEventListener('focusout', updateActive);
        };
    }, [isFocused]);

    const value = useMemo<EditorStateValue>(() => ({
        activeBlockPath,
        activeBlockPathString,
        activeElement,
        activeBlockInfo,
        canRedo,
        canUndo,
        isEditorActive,
        isMultiBlockSelection,
        selection,
    }), [
        activeBlockPath,
        activeBlockPathString,
        activeElement,
        activeBlockInfo,
        canRedo,
        canUndo,
        isEditorActive,
        isMultiBlockSelection,
        selection,
    ]);
    const activeBlockValue = useMemo<ActiveBlockValue>(() => ({
        activeBlockPath,
        activeBlockPathString,
        activeElement,
        activeBlockInfo,
    }), [
        activeBlockPath,
        activeBlockPathString,
        activeElement,
        activeBlockInfo,
    ]);
    const selectionValue = useMemo<SelectionValue>(() => ({
        isMultiBlockSelection,
        selection,
    }), [isMultiBlockSelection, selection]);
    const activityValue = useMemo<ActivityValue>(() => ({
        isEditorActive,
    }), [isEditorActive]);
    const historyValue = useMemo<HistoryValue>(() => ({
        canRedo,
        canUndo,
    }), [canRedo, canUndo]);

    const commands = useMemo<EditorCommandsValue>(() => ({
        redo: () => editor.redo(),
        setBlockType: (type: FountainBlockTypeChangeTarget['type']) => {
            if (!activeElement || !activeBlockPath) {
                return;
            }

            if (type === activeBlockInfo?.type) {
                return;
            }

            applyBlockTypeChange(
                editor,
                activeElement,
                activeBlockPath,
                type,
            );
        },
        toggleMark: (key: 'bold' | 'italic' | 'underline') => {
            const isActive = !!editor.api.marks()?.[key];

            if (isActive) {
                editor.tf.removeMarks(key);

                return;
            }

            editor.tf.addMark(key, true);
        },
        undo: () => editor.undo(),
    }), [
        activeBlockInfo?.type,
        activeBlockPath,
        activeElement,
        editor,
    ]);

    return (
        <EditorStateContext.Provider value={value}>
            <ActiveBlockContext.Provider value={activeBlockValue}>
                <SelectionContext.Provider value={selectionValue}>
                    <ActivityContext.Provider value={activityValue}>
                        <HistoryContext.Provider value={historyValue}>
                            <EditorCommandsContext.Provider value={commands}>
                                {children}
                            </EditorCommandsContext.Provider>
                        </HistoryContext.Provider>
                    </ActivityContext.Provider>
                </SelectionContext.Provider>
            </ActiveBlockContext.Provider>
        </EditorStateContext.Provider>
    );
};
