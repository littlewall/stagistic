import {
    useEffect,
    useRef,
    useState,
} from 'react';

import {Input} from '../atoms/Input';
import {useDropdownDismiss} from '../molecules/forms/useDropdownDismiss';
import styles from './VoiceTypeField.module.css';
import {VOICE_TYPE_SUGGESTIONS} from './voiceTypes';

interface VoiceTypeFieldProps {
    value: string | null,
    onChange: (value: string | null) => void,
    id?: string,
}

export const VoiceTypeField = ({
    value,
    onChange,
    id,
}: VoiceTypeFieldProps) => {
    const [draft, setDraft] = useState(value ?? '');
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useDropdownDismiss(isOpen, setIsOpen, rootRef);

    useEffect(() => {
        setDraft(value ?? '');
    }, [value]);

    const normalizedDraft = draft.trim().toLowerCase();
    const suggestions = VOICE_TYPE_SUGGESTIONS.filter(
        option => option.includes(normalizedDraft),
    );

    const commit = () => {
        const trimmed = draft.trim();

        onChange(trimmed.length > 0 ? trimmed : null);
    };
    const selectSuggestion = (option: string) => {
        setDraft(option);
        setIsOpen(false);
        onChange(option);
    };

    return (
        <div ref={rootRef} className={styles.root}>
            <Input
                id={id}
                size="lg"
                role="combobox"
                aria-expanded={isOpen}
                aria-autocomplete="list"
                aria-label="Voice type"
                placeholder="Voice type"
                value={draft}
                onChange={event => {
                    setDraft(event.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
                onBlur={() => {
                    setIsOpen(false);
                    commit();
                }}
            />
            {isOpen ? (
                <ul
                    role="listbox"
                    aria-label="Voice type suggestions"
                    className={styles.menu}
                >
                    {suggestions.length > 0 ? suggestions.map(option => (
                        <li
                            key={option}
                            role="option"
                            aria-selected={option === normalizedDraft}
                            className={styles.item}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => selectSuggestion(option)}
                        >
                            {option}
                        </li>
                    )) : (
                        <li className={styles.empty}>No matching voice types</li>
                    )}
                </ul>
            ) : null}
        </div>
    );
};
