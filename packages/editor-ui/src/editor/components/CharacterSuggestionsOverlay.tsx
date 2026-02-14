import {
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    extractCharacterKeys,
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/editor-core';
import {TextSelection} from '@tiptap/pm/state';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type RefObject,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {getCharacterColor} from '../characterColors';
import {
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainBlockType,
    getActiveFountainBlockFromState,
    isSelectionAcrossBlocks,
    normalizeFountainBlockType,
} from '../tiptap/fountainCore';
import styles from './CharacterSuggestionsOverlay.module.css';

type CharacterSuggestionsOverlayProps = {
    editor: TiptapEditor | null,
    canvasRef: RefObject<HTMLElement | null>,
    persistentCharacters?: readonly PersistentCharacterRef[],
};

type PersistentCharacterRef = {
    id: string,
    key: string,
};

type SuggestionEntry = {
    key: string,
    color: string,
};

type OverlayState = {
    style: CSSProperties,
    suggestions: SuggestionEntry[],
};

type SuppressedSelection = {
    blockId: string,
    position: number,
};

const MAX_SUGGESTIONS = 6;
const OVERLAY_WIDTH_PX = 220;
const CHARACTER_TAG_HORIZONTAL_PADDING_PX = 7;

const isCharacterBlockType = (value: FountainBlockType) => {
    return value === ELEMENT_CHARACTER || value === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

const splitBaseAndSuffix = (value: string) => {
    const trimmed = value.trim();
    const suffixMatch = trimmed.match(/\s*(\([^()]*\)\s*)+$/);

    if (!suffixMatch) {
        return {
            base: trimmed,
            suffix: '',
        };
    }

    const suffix = suffixMatch[0].trim();
    const base = trimmed.slice(0, trimmed.length - suffixMatch[0].length).trim();

    return {
        base,
        suffix,
    };
};

const getActiveTokenIndex = (line: string, offset: number) => {
    const tokens = splitCharacterTokens(line);

    if (tokens.length === 0) {
        return -1;
    }

    const clampedOffset = Math.max(0, offset);

    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];

        if (clampedOffset === token.end && index < tokens.length - 1) {
            return index + 1;
        }

        if (clampedOffset >= token.start && clampedOffset < token.end) {
            return index;
        }
    }

    return tokens.length - 1;
};

const getSafeCoordsAtPos = (editor: TiptapEditor, pos: number, fallbackPos: number) => {
    try {
        return editor.view.coordsAtPos(pos);
    } catch {
        try {
            return editor.view.coordsAtPos(fallbackPos);
        } catch {
            return null;
        }
    }
};

const getSizeScale = (element: HTMLElement) => {
    const raw = window.getComputedStyle(element).getPropertyValue('--size-scale');
    const parsed = Number.parseFloat(raw);

    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const collectCharacterCounts = (
    editor: TiptapEditor,
    persistentCharacters: readonly PersistentCharacterRef[],
) => {
    const counts = new Map<string, number>();

    persistentCharacters.forEach(character => {
        const key = normalizeCharacterKey(character.key);

        if (key.length > 0 && !counts.has(key)) {
            counts.set(key, 0);
        }
    });

    editor.state.doc.descendants(node => {
        if (node.type.name !== FOUNTAIN_BLOCK_NODE_NAME) {
            return true;
        }

        const blockType = normalizeFountainBlockType(node.attrs.blockType);

        if (!isCharacterBlockType(blockType)) {
            return false;
        }

        extractCharacterKeys(node.textContent ?? '').forEach(key => {
            counts.set(key, (counts.get(key) ?? 0) + 1);
        });

        return false;
    });

    return counts;
};

const applyCharacterSuggestion = (editor: TiptapEditor, suggestion: string): SuppressedSelection | null => {
    const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (
        !block
        || !isCharacterBlockType(block.blockType)
        || !editor.state.selection.empty
    ) {
        return null;
    }

    const text = block.node.textContent ?? '';
    const tokens = splitCharacterTokens(text);
    const offset = Math.max(0, editor.state.selection.from - block.from);
    const activeTokenIndex = getActiveTokenIndex(text, offset);
    const activeToken = tokens[activeTokenIndex];

    if (!activeToken) {
        return null;
    }

    const {
        suffix,
    } = splitBaseAndSuffix(activeToken.value);
    const replacement = suffix.length > 0
        ? `${suggestion} ${suffix}`
        : suggestion;
    const selectedKey = normalizeCharacterKey(replacement);
    const mergedValues = tokens.map((token, index) => {
        if (index === activeTokenIndex) {
            return replacement;
        }

        return token.value.trim();
    });
    const dedupedValues: string[] = [];
    const seen = new Set<string>();

    mergedValues.forEach((value, index) => {
        const normalized = value.trim();
        const key = normalizeCharacterKey(normalized);

        if (normalized.length === 0 || key.length === 0) {
            return;
        }

        if (index !== activeTokenIndex && key === selectedKey) {
            return;
        }

        if (seen.has(key)) {
            return;
        }

        seen.add(key);
        dedupedValues.push(normalized);
    });

    const nextLine = dedupedValues.join('+');
    let tr = editor.state.tr.insertText(nextLine, block.from, block.to);
    const nextSelection = block.from + nextLine.length;

    tr = tr.setSelection(TextSelection.create(tr.doc, nextSelection));
    editor.view.dispatch(tr.scrollIntoView());
    editor.commands.focus(nextSelection);

    const nextBlock = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

    if (!nextBlock) {
        return null;
    }

    return {
        blockId: nextBlock.id,
        position: editor.state.selection.from,
    };
};

const CharacterSuggestionsOverlay = ({
    editor,
    canvasRef,
    persistentCharacters = [],
}: CharacterSuggestionsOverlayProps) => {
    const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
    const rafIdRef = useRef<number | null>(null);
    const suppressedSelectionRef = useRef<SuppressedSelection | null>(null);
    const normalizedPersistentCharacters = useMemo(() => {
        const seenIds = new Set<string>();
        const seen = new Set<string>();
        const result: PersistentCharacterRef[] = [];

        persistentCharacters.forEach(character => {
            const key = normalizeCharacterKey(character.key);

            if (!character.id || seenIds.has(character.id)) {
                return;
            }

            if (key.length === 0 || seen.has(key)) {
                return;
            }

            seenIds.add(character.id);
            seen.add(key);
            result.push({
                id: character.id,
                key,
            });
        });

        return result;
    }, [persistentCharacters]);

    const updateOverlay = useCallback(() => {
        const canvas = canvasRef.current;

        if (!editor || !canvas) {
            setOverlayState(null);

            return;
        }

        if (isSelectionAcrossBlocks(editor.state, FOUNTAIN_BLOCK_NODE_NAME)) {
            setOverlayState(null);

            return;
        }

        const block = getActiveFountainBlockFromState(editor.state, FOUNTAIN_BLOCK_NODE_NAME);

        if (
            !block
            || !isCharacterBlockType(block.blockType)
            || !editor.state.selection.empty
        ) {
            setOverlayState(null);

            return;
        }

        const suppressedSelection = suppressedSelectionRef.current;

        if (suppressedSelection) {
            if (
                suppressedSelection.blockId === block.id
                && suppressedSelection.position === editor.state.selection.from
            ) {
                setOverlayState(null);

                return;
            }

            suppressedSelectionRef.current = null;
        }

        const text = block.node.textContent ?? '';
        const tokens = splitCharacterTokens(text);
        const offset = Math.max(0, editor.state.selection.from - block.from);
        const activeTokenIndex = getActiveTokenIndex(text, offset);
        const activeToken = tokens[activeTokenIndex];

        if (!activeToken) {
            setOverlayState(null);

            return;
        }

        const {
            base,
        } = splitBaseAndSuffix(activeToken.value);
        const query = normalizeCharacterKey(base);
        const activeKey = normalizeCharacterKey(activeToken.value);
        const occupiedKeys = new Set<string>();
        const counts = collectCharacterCounts(editor, normalizedPersistentCharacters);
        const hasKnownActiveCharacter = activeKey.length > 0 && counts.has(activeKey);
        const shouldFilterByPrefix = !(hasKnownActiveCharacter && query === activeKey);

        tokens.forEach((token, index) => {
            if (index === activeTokenIndex) {
                return;
            }

            const key = normalizeCharacterKey(token.value);

            if (key.length > 0) {
                occupiedKeys.add(key);
            }
        });

        const suggestionRows = Array.from(counts.entries())
            .filter(([key]) => key !== activeKey)
            .filter(([key]) => !occupiedKeys.has(key))
            .filter(([key]) => !shouldFilterByPrefix || query.length === 0 || key.startsWith(query))
            .sort((a, b) => {
                if (b[1] !== a[1]) {
                    return b[1] - a[1];
                }

                return a[0].localeCompare(b[0]);
            })
            .slice(0, MAX_SUGGESTIONS);

        if (suggestionRows.length === 0) {
            setOverlayState(null);

            return;
        }

        const anchorStartPos = block.from + activeToken.valueStart;
        const safeAnchorStartPos = Math.max(block.from, Math.min(anchorStartPos, block.to));
        const anchorEndPos = block.from + Math.max(activeToken.valueEnd, activeToken.valueStart + 1);
        const safeAnchorEndPos = Math.max(safeAnchorStartPos, Math.min(anchorEndPos, block.to));
        const cursorPos = editor.state.selection.from;
        const anchorStartCoords = getSafeCoordsAtPos(editor, safeAnchorStartPos, cursorPos);
        const anchorEndCoords = getSafeCoordsAtPos(editor, safeAnchorEndPos, cursorPos);

        if (!anchorStartCoords || !anchorEndCoords) {
            setOverlayState(null);

            return;
        }

        const canvasRect = canvas.getBoundingClientRect();
        const sizeScale = getSizeScale(canvas);
        const tagPadding = CHARACTER_TAG_HORIZONTAL_PADDING_PX * sizeScale;
        const rawLeft = anchorStartCoords.left - canvasRect.left + canvas.scrollLeft - tagPadding;
        const minLeft = canvas.scrollLeft;
        const maxLeft = canvas.scrollLeft + canvas.clientWidth - OVERLAY_WIDTH_PX;
        const left = Math.max(minLeft, Math.min(rawLeft, Math.max(minLeft, maxLeft)));
        const top = anchorEndCoords.bottom - canvasRect.top + canvas.scrollTop;
        const suggestions = suggestionRows.map(([key]) => ({
            key,
            color: getCharacterColor(key),
        }));

        setOverlayState({
            style: {
                top,
                left,
            },
            suggestions,
        });
    }, [
        canvasRef,
        editor,
        normalizedPersistentCharacters,
    ]);

    const scheduleOverlayUpdate = useCallback(() => {
        if (rafIdRef.current !== null) {
            return;
        }

        rafIdRef.current = window.requestAnimationFrame(() => {
            rafIdRef.current = null;
            updateOverlay();
        });
    }, [updateOverlay]);

    useLayoutEffect(() => {
        scheduleOverlayUpdate();
    }, [scheduleOverlayUpdate]);

    useEffect(() => {
        if (!editor) {
            return;
        }

        const handleUpdate = () => scheduleOverlayUpdate();

        editor.on('selectionUpdate', handleUpdate);
        editor.on('transaction', handleUpdate);
        editor.on('focus', handleUpdate);
        editor.on('blur', handleUpdate);

        return () => {
            editor.off('selectionUpdate', handleUpdate);
            editor.off('transaction', handleUpdate);
            editor.off('focus', handleUpdate);
            editor.off('blur', handleUpdate);
        };
    }, [editor, scheduleOverlayUpdate]);

    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const handleScroll = () => scheduleOverlayUpdate();

        canvas.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', handleScroll);

        return () => {
            canvas.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [canvasRef, scheduleOverlayUpdate]);

    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                window.cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, []);

    const suggestionEntries = useMemo(
        () => overlayState?.suggestions ?? [],
        [overlayState],
    );

    const handleSuggestionMouseDown = useCallback((suggestion: string, event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        if (!editor) {
            return;
        }

        suppressedSelectionRef.current = applyCharacterSuggestion(editor, suggestion);
        setOverlayState(null);
    }, [editor]);

    if (!overlayState || !editor) {
        return null;
    }

    return (
        <div className={styles.overlay} style={overlayState.style}>
            <div
                className={styles.panel}
                role="listbox"
                aria-label="Character suggestions"
            >
                {suggestionEntries.map(suggestion => (
                    <button
                        key={suggestion.key}
                        className={styles.item}
                        type="button"
                        role="option"
                        onMouseDown={event => handleSuggestionMouseDown(suggestion.key, event)}
                    >
                        <span className={styles.itemDot} style={{backgroundColor: suggestion.color}} />
                        <span className={styles.itemLabel}>{suggestion.key}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CharacterSuggestionsOverlay;
