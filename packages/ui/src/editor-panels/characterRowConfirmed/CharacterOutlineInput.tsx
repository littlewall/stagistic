import clsx from 'clsx';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import styles from '../EditorSidebar.module.css';
import type {EditorSidebarCharacter} from '../types';

const OUTLINE_SAVE_DEBOUNCE_MS = 500;

interface CharacterOutlineInputProps {
    character: EditorSidebarCharacter,
    isVisible?: boolean,
    multiline?: boolean,
    className?: string,
    containerClassName?: string,
    onSetCharacterOutline?: (characterId: string, outline: string | null) => void,
}

export const CharacterOutlineInput = ({
    character,
    isVisible = true,
    multiline = true,
    className,
    containerClassName,
    onSetCharacterOutline,
}: CharacterOutlineInputProps) => {
    const characterId = character.id ?? '';
    const persistedOutline = character.outline ?? '';
    const [outlineDraft, setOutlineDraft] = useState(persistedOutline);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef(persistedOutline);

    useEffect(() => {
        if (persistedOutline !== lastSavedRef.current) {
            lastSavedRef.current = persistedOutline;
            setOutlineDraft(persistedOutline);
        }
    }, [persistedOutline]);

    const autoResize = useCallback(() => {
        const textarea = textareaRef.current;

        if (!textarea) {
            return;
        }

        textarea.style.height = 'auto';
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    useLayoutEffect(() => {
        if (isVisible) {
            autoResize();
        }
    }, [
        autoResize,
        isVisible,
        outlineDraft,
    ]);

    const commitOutline = useCallback((value: string) => {
        if (!characterId || !onSetCharacterOutline || value === lastSavedRef.current) {
            return;
        }

        lastSavedRef.current = value;
        onSetCharacterOutline(characterId, value.length > 0 ? value : null);
    }, [characterId, onSetCharacterOutline]);

    const handleChange = useCallback((value: string) => {
        setOutlineDraft(value);

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            commitOutline(value);
        }, OUTLINE_SAVE_DEBOUNCE_MS);
    }, [commitOutline]);

    const handleBlur = useCallback(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }

        commitOutline(outlineDraft);
    }, [commitOutline, outlineDraft]);

    useEffect(() => () => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
    }, []);

    if (!isVisible) {
        return null;
    }

    if (!multiline) {
        return (
            <div className={containerClassName}>
                <input
                    type="text"
                    className={className}
                    placeholder="Outline"
                    aria-label={`Outline for ${character.key}`}
                    value={outlineDraft}
                    onChange={event => handleChange(event.target.value)}
                    onBlur={handleBlur}
                />
            </div>
        );
    }

    return (
        <div className={containerClassName}>
            <textarea
                ref={textareaRef}
                className={clsx(styles.characterOutlineInput, className)}
                rows={1}
                placeholder="Outline"
                aria-label={`Outline for ${character.key}`}
                value={outlineDraft}
                onChange={event => handleChange(event.target.value)}
                onBlur={handleBlur}
            />
        </div>
    );
};
