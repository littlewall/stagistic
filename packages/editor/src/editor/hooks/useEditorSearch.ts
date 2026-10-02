import type {ScriptBlockNodeType} from '@stagistic/script';
import {isApplePlatform} from '@stagistic/shared';
import {useHotkey} from '@tanstack/react-hotkeys';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEditorState} from '@tiptap/react';
import type {
    ChangeEventHandler,
    KeyboardEventHandler,
    RefObject,
} from 'react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';

import type {EditorSearchProps} from '../contracts';
import {getEditorSearchSnapshot, getSceneCollapseSnapshot} from '../tiptap/extensions';
import {findCollapsedSceneContainingPosition} from '../tiptap/extensions/sceneCollapse/sceneCollapseModel';

interface UseEditorSearchArgs {
    editor: TiptapEditor | null,
    /** Host-owned block filter; without it the filter lives only as long as the editor. */
    search?: EditorSearchProps,
}

export interface UseEditorSearchResult {
    inputRef: RefObject<HTMLInputElement | null>,
    query: string,
    currentResult: number,
    resultCount: number,
    onQueryChange: ChangeEventHandler<HTMLInputElement>,
    onInputKeyDown: KeyboardEventHandler<HTMLInputElement>,
    onClear: () => void,
    onPreviousResult: () => void,
    onNextResult: () => void,
    isCaseSensitive: boolean,
    onCaseSensitiveChange: (isCaseSensitive: boolean) => void,
    isWholeWord: boolean,
    onWholeWordChange: (isWholeWord: boolean) => void,
    blockTypes: readonly ScriptBlockNodeType[],
    onBlockTypesChange: (blockTypes: readonly ScriptBlockNodeType[]) => void,
    replaceInputRef: RefObject<HTMLInputElement | null>,
    isReplaceOpen: boolean,
    onReplaceOpenChange: (isOpen: boolean) => void,
    replacement: string,
    canReplace: boolean,
    onReplacementChange: ChangeEventHandler<HTMLInputElement>,
    onReplace: () => void,
    onReplaceAll: () => void,
}

const NO_BLOCK_TYPES: readonly ScriptBlockNodeType[] = [];

const isSameBlockTypes = (current: readonly ScriptBlockNodeType[] | null, next: readonly ScriptBlockNodeType[]) => {
    const types = current ?? NO_BLOCK_TYPES;

    return types.length === next.length && next.every(type => types.includes(type));
};

const getWindowTarget = () => typeof window === 'undefined' ? null : window;

// VS Code's replace shortcut: Cmd+Alt+F on Apple (Cmd+H hides the app), Ctrl+H elsewhere.
const REPLACE_HOTKEY = isApplePlatform() ? 'Mod+Alt+F' : 'Mod+H';

const ownsAnotherEditingContext = (target: EventTarget | null, editorElement: HTMLElement, ownInputs: readonly (HTMLInputElement | null)[]) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (editorElement.contains(target) || ownInputs.includes(target as HTMLInputElement)) {
        return false;
    }

    return Boolean(target.closest('input, textarea, [contenteditable="true"], [role="dialog"]'));
};

export const useEditorSearch = ({editor, search}: UseEditorSearchArgs): UseEditorSearchResult => {
    const inputRef = useRef<HTMLInputElement>(null);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const pendingReplaceFocusRef = useRef(false);
    const [isReplaceOpen, setIsReplaceOpen] = useState(false);
    const [localBlockTypes, setLocalBlockTypes] = useState(NO_BLOCK_TYPES);
    const blockTypes = search?.blockTypes ?? localBlockTypes;
    const onBlockTypesChange = search?.onBlockTypesChange ?? setLocalBlockTypes;
    const state = useEditorState({
        editor,
        selector: ({editor: stateEditor}) => {
            if (!stateEditor) {
                return {
                    query: '',
                    currentIndex: -1,
                    resultCount: 0,
                    activeFrom: null,
                    isCaseSensitive: false,
                    isWholeWord: false,
                    isEditable: false,
                };
            }

            const snapshot = getEditorSearchSnapshot(stateEditor.state);
            const active = snapshot.currentIndex >= 0 ? snapshot.results[snapshot.currentIndex] : null;

            return {
                query: snapshot.criteria.query,
                currentIndex: snapshot.currentIndex,
                resultCount: snapshot.results.length,
                activeFrom: active?.from ?? null,
                isCaseSensitive: snapshot.criteria.caseSensitive,
                isWholeWord: snapshot.criteria.wholeWord,
                isEditable: stateEditor.isEditable,
            };
        },
        equalityFn: (a, b) => Boolean(
            a && b
            && a.query === b.query
            && a.currentIndex === b.currentIndex
            && a.resultCount === b.resultCount
            && a.activeFrom === b.activeFrom
            && a.isCaseSensitive === b.isCaseSensitive
            && a.isWholeWord === b.isWholeWord
            && a.isEditable === b.isEditable,
        ),
    }) ?? {
        query: '',
        currentIndex: -1,
        resultCount: 0,
        activeFrom: null,
        isCaseSensitive: false,
        isWholeWord: false,
        isEditable: false,
    };
    const [replacement, setReplacement] = useState('');

    const onQueryChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
        event => {
            if (!editor) {
                return;
            }

            const criteria = getEditorSearchSnapshot(editor.state).criteria;

            editor.commands.setSearchCriteria({
                ...criteria,
                query: event.target.value,
            });
        },
        [editor],
    );

    const onPreviousResult = useCallback(() => {
        editor?.commands.goToPreviousSearchResult();
    }, [editor]);

    const onNextResult = useCallback(() => {
        editor?.commands.goToNextSearchResult();
    }, [editor]);

    const onClear = useCallback(() => {
        editor?.commands.clearSearch();
        inputRef.current?.focus();
    }, [editor]);

    const onCaseSensitiveChange = useCallback((isCaseSensitive: boolean) => {
        if (!editor) {
            return;
        }

        editor.commands.setSearchCriteria({
            ...getEditorSearchSnapshot(editor.state).criteria,
            caseSensitive: isCaseSensitive,
        });
    }, [editor]);

    const onWholeWordChange = useCallback((isWholeWord: boolean) => {
        if (!editor) {
            return;
        }

        editor.commands.setSearchCriteria({
            ...getEditorSearchSnapshot(editor.state).criteria,
            wholeWord: isWholeWord,
        });
    }, [editor]);

    // The filter is owned outside the plugin (it outlives a search), so it is pushed into the criteria.
    useEffect(() => {
        if (!editor || editor.isDestroyed) {
            return;
        }

        const criteria = getEditorSearchSnapshot(editor.state).criteria;

        if (!isSameBlockTypes(criteria.blockTypes, blockTypes)) {
            editor.commands.setSearchCriteria({...criteria, blockTypes});
        }
    }, [blockTypes, editor]);

    const focusReplaceInput = useCallback(() => {
        pendingReplaceFocusRef.current = false;
        replaceInputRef.current?.focus();
        replaceInputRef.current?.select();
    }, []);

    const onReplacementChange = useCallback<ChangeEventHandler<HTMLInputElement>>(event => {
        setReplacement(event.target.value);
    }, []);

    const onReplace = useCallback(() => {
        editor?.commands.replaceCurrentSearchResult(replacement);
    }, [editor, replacement]);

    const onReplaceAll = useCallback(() => {
        editor?.commands.replaceAllSearchResults(replacement);
    }, [editor, replacement]);

    const onInputKeyDown = useCallback<KeyboardEventHandler<HTMLInputElement>>(
        event => {
            if (event.nativeEvent.isComposing || event.key !== 'Enter') {
                return;
            }

            event.preventDefault();

            if (event.shiftKey) {
                editor?.commands.goToPreviousSearchResult();
            } else {
                editor?.commands.goToNextSearchResult();
            }
        },
        [editor],
    );

    useHotkey(
        'Mod+F',
        event => {
            const editorElement = editor?.view.dom;

            if (!editorElement || ownsAnotherEditingContext(event.target, editorElement, [inputRef.current, replaceInputRef.current])) {
                return;
            }

            event.preventDefault();
            inputRef.current?.focus();
            inputRef.current?.select();
        },
        {
            enabled: Boolean(editor),
            target: getWindowTarget(),
            preventDefault: false,
            stopPropagation: false,
        },
    );

    useHotkey(
        REPLACE_HOTKEY,
        event => {
            const editorElement = editor?.view.dom;

            if (!editorElement || ownsAnotherEditingContext(event.target, editorElement, [inputRef.current, replaceInputRef.current])) {
                return;
            }

            event.preventDefault();
            pendingReplaceFocusRef.current = true;
            setIsReplaceOpen(true);

            if (replaceInputRef.current) {
                focusReplaceInput();
            }
        },
        {
            enabled: Boolean(editor),
            target: getWindowTarget(),
            preventDefault: false,
            stopPropagation: false,
        },
    );

    useEffect(() => {
        if (isReplaceOpen && pendingReplaceFocusRef.current) {
            focusReplaceInput();
        }
    }, [focusReplaceInput, isReplaceOpen]);

    useEffect(() => {
        if (!editor || state.activeFrom === null) {
            return;
        }

        const snapshot = getSceneCollapseSnapshot(editor.state);
        const containingScene = findCollapsedSceneContainingPosition(snapshot.ranges, new Set(snapshot.collapsedSceneIds), state.activeFrom);

        if (containingScene) {
            editor.commands.expandScene(containingScene.sceneBlockId);
        }

        let secondFrame: number | null = null;
        const firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => {
                if (editor.isDestroyed) {
                    return;
                }

                editor.view.dom.querySelector<HTMLElement>('[data-editor-search-current="true"]')?.scrollIntoView({block: 'center', inline: 'nearest'});
            });
        });

        return () => {
            window.cancelAnimationFrame(firstFrame);

            if (secondFrame !== null) {
                window.cancelAnimationFrame(secondFrame);
            }
        };
    }, [editor, state.activeFrom]);

    return {
        inputRef,
        query: state.query,
        currentResult: state.currentIndex < 0 ? 0 : state.currentIndex + 1,
        resultCount: state.resultCount,
        onQueryChange,
        onInputKeyDown,
        onClear,
        onPreviousResult,
        onNextResult,
        isCaseSensitive: state.isCaseSensitive,
        onCaseSensitiveChange,
        isWholeWord: state.isWholeWord,
        onWholeWordChange,
        blockTypes,
        onBlockTypesChange,
        replaceInputRef,
        isReplaceOpen,
        onReplaceOpenChange: setIsReplaceOpen,
        replacement,
        canReplace: state.isEditable && state.resultCount > 0,
        onReplacementChange,
        onReplace,
        onReplaceAll,
    };
};
