import {useHotkey} from '@tanstack/react-hotkeys';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {useEditorState} from '@tiptap/react';
import type {ChangeEventHandler, KeyboardEventHandler, RefObject} from 'react';
import {useCallback, useEffect, useRef} from 'react';

import {getEditorSearchSnapshot, getSceneCollapseSnapshot} from '../tiptap/extensions';
import {findCollapsedSceneContainingPosition} from '../tiptap/extensions/sceneCollapse/sceneCollapseModel';

interface UseEditorSearchArgs {
    editor: TiptapEditor | null;
}

export interface UseEditorSearchResult {
    inputRef: RefObject<HTMLInputElement | null>;
    query: string;
    currentResult: number;
    resultCount: number;
    onQueryChange: ChangeEventHandler<HTMLInputElement>;
    onInputKeyDown: KeyboardEventHandler<HTMLInputElement>;
    onClear: () => void;
    onPreviousResult: () => void;
    onNextResult: () => void;
}

const getWindowTarget = () => (typeof window === 'undefined' ? null : window);

const ownsAnotherEditingContext = (target: EventTarget | null, editorElement: HTMLElement, searchInput: HTMLInputElement | null) => {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (editorElement.contains(target) || searchInput === target) {
        return false;
    }

    return Boolean(target.closest('input, textarea, [contenteditable="true"], [role="dialog"]'));
};

export const useEditorSearch = ({editor}: UseEditorSearchArgs): UseEditorSearchResult => {
    const inputRef = useRef<HTMLInputElement>(null);
    const state = useEditorState({
        editor,
        selector: ({editor: stateEditor}) => {
            if (!stateEditor) {
                return {query: '', currentIndex: -1, resultCount: 0, activeFrom: null};
            }

            const snapshot = getEditorSearchSnapshot(stateEditor.state);
            const active = snapshot.currentIndex >= 0 ? snapshot.results[snapshot.currentIndex] : null;

            return {
                query: snapshot.criteria.query,
                currentIndex: snapshot.currentIndex,
                resultCount: snapshot.results.length,
                activeFrom: active?.from ?? null,
            };
        },
        equalityFn: (a, b) =>
            Boolean(a && b && a.query === b.query && a.currentIndex === b.currentIndex && a.resultCount === b.resultCount && a.activeFrom === b.activeFrom),
    }) ?? {query: '', currentIndex: -1, resultCount: 0, activeFrom: null};

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

            if (!editorElement || ownsAnotherEditingContext(event.target, editorElement, inputRef.current)) {
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
    };
};
