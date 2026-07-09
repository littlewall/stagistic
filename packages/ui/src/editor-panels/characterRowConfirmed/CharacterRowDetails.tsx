import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';

import styles from '../EditorSidebar.module.css';
import type {CharacterRowDetailsProps} from './contracts';

const OUTLINE_SAVE_DEBOUNCE_MS = 500;

export const CharacterRowDetails = ({
    model,
    state,
    actions,
}: CharacterRowDetailsProps) => {
    const {character} = model;
    const characterId = character.id ?? '';
    const persistedOutline = character.outline ?? '';

    const [outlineDraft, setOutlineDraft] = useState(persistedOutline);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedRef = useRef(persistedOutline);

    const {onSetCharacterOutline} = actions;

    /*
     * Re-seed the draft when a different persisted value arrives (e.g. character
     * switch or external update) that the user has not diverged from locally.
     */
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
        // CSS max-height caps this at ~two lines and enables scrolling beyond.
        textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    useLayoutEffect(() => {
        if (state.isExpanded) {
            autoResize();
        }
    }, [
        autoResize,
        outlineDraft,
        state.isExpanded,
    ]);

    const commitOutline = useCallback((value: string) => {
        if (!characterId || !onSetCharacterOutline) {
            return;
        }

        if (value === lastSavedRef.current) {
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

    if (!state.isExpanded) {
        return null;
    }

    return (
        <div className={styles.characterDetails}>
            <textarea
                ref={textareaRef}
                className={styles.characterOutlineInput}
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
