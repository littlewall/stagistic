import {
    CHARACTER_TAG_MARK_NAME,
    normalizeCharacterKey,
} from '@stagistic/script';
import type {Editor as TiptapEditor} from '@tiptap/react';
import {
    createContext,
    type ReactNode,
    type RefObject,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

import {scanCharacterTokensFromDoc} from '../characters/characterTokenScan';
import {
    findTagRangeForConfirm,
    readCommittedTagCharacterId,
} from '../tiptap/extensions/characterTagInput/markRanges';

export type EditorElementSelection =
    | {type: 'cue', cueId: string}
    | {
        type: 'character', characterId: string | null, characterKey: string,
    }
    | null;

const EditorElementSelectionContext = createContext<EditorElementSelection>(null);

interface EditorElementSelectionProviderProps {
    editor: TiptapEditor | null,
    rootRef: RefObject<HTMLElement | null>,
    children: ReactNode,
}

const isSameSelection = (
    current: EditorElementSelection,
    next: EditorElementSelection,
) => {
    if (current?.type !== next?.type) {
        return false;
    }

    if (!current || !next) {
        return current === next;
    }

    if (current.type === 'cue' && next.type === 'cue') {
        return current.cueId === next.cueId;
    }

    return current.type === 'character'
        && next.type === 'character'
        && current.characterId === next.characterId
        && current.characterKey === next.characterKey;
};

const resolveCharacterSelectionFromEditor = (
    editor: TiptapEditor,
): EditorElementSelection => {
    const {state} = editor;
    const activeToken = scanCharacterTokensFromDoc({
        doc: state.doc,
        selectionFrom: state.selection.from,
    }).activeToken;

    if (activeToken?.key) {
        return {
            type: 'character',
            characterId: activeToken.characterId,
            characterKey: activeToken.key,
        };
    }

    const markType = state.schema.marks[CHARACTER_TAG_MARK_NAME];

    if (!markType) {
        return null;
    }

    const range = findTagRangeForConfirm(state, markType);

    if (!range) {
        return null;
    }

    const characterKey = normalizeCharacterKey(state.doc.textBetween(range.from, range.to));

    if (!characterKey) {
        return null;
    }

    return {
        type: 'character',
        characterId: readCommittedTagCharacterId(state, range.from, range.to, markType),
        characterKey,
    };
};

const resolveSelection = (
    root: HTMLElement | null,
    target: EventTarget | null,
): EditorElementSelection => {
    if (!(target instanceof Element) || !root?.contains(target)) {
        return null;
    }

    const cuePill = target.closest<HTMLElement>('[data-cue-pill]');

    if (cuePill) {
        const cueId = cuePill.dataset.cueId
            ?? cuePill.querySelector<HTMLElement>('[data-cue-id]')?.dataset.cueId
            ?? '';

        return cueId ? {type: 'cue', cueId} : null;
    }

    const characterPill = target.closest<HTMLElement>('[data-character-key]');
    const characterKey = characterPill?.dataset.characterKey ?? '';

    if (!characterPill || !characterKey) {
        return null;
    }

    return {
        type: 'character',
        characterId: characterPill.dataset.characterId ?? null,
        characterKey,
    };
};

export const EditorElementSelectionProvider = ({
    editor,
    rootRef,
    children,
}: EditorElementSelectionProviderProps) => {
    const [selection, setSelection] = useState<EditorElementSelection>(null);
    const isTrackingCharacterRef = useRef(false);

    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            const nextSelection = resolveSelection(rootRef.current, event.target);

            isTrackingCharacterRef.current = nextSelection?.type === 'character';
            setSelection(nextSelection);
        };

        document.addEventListener('pointerdown', handlePointerDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [rootRef]);

    useEffect(() => {
        if (!editor) {
            return undefined;
        }

        const syncCharacterSelection = () => {
            if (!isTrackingCharacterRef.current) {
                return;
            }

            const nextSelection = resolveCharacterSelectionFromEditor(editor);

            setSelection(current => {
                if (isSameSelection(current, nextSelection)) {
                    return current;
                }

                return nextSelection;
            });
        };

        editor.on('transaction', syncCharacterSelection);

        return () => {
            editor.off('transaction', syncCharacterSelection);
        };
    }, [editor]);

    return (
        <EditorElementSelectionContext.Provider value={selection}>
            {children}
        </EditorElementSelectionContext.Provider>
    );
};

export const useEditorElementSelection = () => useContext(EditorElementSelectionContext);
