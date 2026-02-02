import type {FountainBlockTypeChangeTarget} from '@stagistic/editor-core';
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
    isEditorActive: boolean,
    isMultiBlockSelection: boolean,
    selection: Range | null,
};

const EditorStateContext = createContext<EditorStateValue | null>(null);

export const useEditorState = () => {
    const context = useContext(EditorStateContext);

    if (!context) {
        throw new Error('useEditorState must be used within EditorStateProvider');
    }

    return context;
};

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
        isEditorActive,
        isMultiBlockSelection,
        selection,
    }), [
        activeBlockPath,
        activeBlockPathString,
        activeElement,
        activeBlockInfo,
        isEditorActive,
        isMultiBlockSelection,
        selection,
    ]);

    return (
        <EditorStateContext.Provider value={value}>
            {children}
        </EditorStateContext.Provider>
    );
};
