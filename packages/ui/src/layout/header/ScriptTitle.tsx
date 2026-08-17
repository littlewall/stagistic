import {
    type ChangeEvent,
    type FocusEvent,
    type KeyboardEvent,
    useEffect,
    useRef,
    useState,
} from 'react';

import styles from '../AppHeader.module.css';

const MAX_SCRIPT_TITLE_LENGTH = 120;

type ScriptTitleProps = {
    name: string,
    onRename?: (name: string) => void,
};

export const ScriptTitle = ({name, onRename}: ScriptTitleProps) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const shouldRevertOnBlurRef = useRef(false);
    const [draft, setDraft] = useState(name);

    useEffect(() => {
        if (document.activeElement !== inputRef.current) {
            setDraft(name);
        }
    }, [name]);

    if (!onRename) {
        return <span className={styles.scriptTitleStatic}>{name}</span>;
    }

    const commit = () => {
        if (shouldRevertOnBlurRef.current) {
            shouldRevertOnBlurRef.current = false;
            setDraft(name);

            return;
        }

        const next = draft.replace(/\s+/gu, ' ').trim();

        if (next === '' || next === name) {
            setDraft(name);

            return;
        }

        setDraft(next);
        onRename(next);
    };

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        setDraft(event.target.value);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            inputRef.current?.blur();

            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            shouldRevertOnBlurRef.current = true;
            inputRef.current?.blur();
        }
    };

    const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
        event.target.select();
    };

    return (
        <span className={styles.scriptTitle} data-value={draft}>
            <input
                ref={inputRef}
                className={styles.scriptTitleInput}
                value={draft}
                maxLength={MAX_SCRIPT_TITLE_LENGTH}
                spellCheck={false}
                aria-label="Script name"
                title="Rename script"
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={commit}
            />
        </span>
    );
};
