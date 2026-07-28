import clsx from 'clsx';
import {
    type MouseEvent,
    useId,
    useRef,
    useState,
} from 'react';
import {
    type Tag,
    WithContext as ReactTags,
} from 'react-tag-input';

import {CloseIcon} from '../../icons';
import styles from './MultiComboBox.module.css';

export interface MultiComboBoxOption {
    id: string,
    label: string,
}

interface MultiComboBoxProps {
    label: string,
    placeholder: string,
    options: MultiComboBoxOption[],
    value: string[],
    onChange: (value: string[]) => void,
    className?: string,
    isDisabled?: boolean,
    emptyLabel?: string,
}

interface RemoveTagButtonProps {
    className?: string,
    onRemove: (event: MouseEvent<HTMLButtonElement>) => void,
    tag: Tag,
}

const RemoveTagButton = ({
    className,
    onRemove,
    tag,
}: RemoveTagButtonProps) => (
    <button
        className={className}
        type="button"
        aria-label={`Remove ${tag.text}`}
        onClick={onRemove}
    >
        <CloseIcon aria-hidden="true" />
    </button>
);

const toTag = ({id, label}: MultiComboBoxOption): Tag => ({
    id,
    text: label,
    className: '',
});

export const MultiComboBox = ({
    label,
    placeholder,
    options,
    value,
    onChange,
    className,
    isDisabled = false,
}: MultiComboBoxProps) => {
    const inputId = useId();
    const rootRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const selectedTags = value.flatMap(id => {
        const option = options.find(candidate => candidate.id === id);

        return option ? [toTag(option)] : [];
    });
    const suggestions = options.map(toTag);
    const closeSuggestions = () => {
        setIsFocused(false);
        queueMicrotask(() => {
            rootRef.current
                ?.querySelector<HTMLInputElement>('input[data-automation="input"]')
                ?.blur();
        });
    };
    const handleAddition = (tag: Tag) => {
        if (options.some(option => option.id === tag.id) && !value.includes(tag.id)) {
            onChange([...value, tag.id]);
        }

        closeSuggestions();
    };
    const handleDelete = (index: number) => {
        const tag = selectedTags[index];

        if (tag) {
            onChange(value.filter(id => id !== tag.id));
        }
    };

    return (
        <div
            ref={rootRef}
            className={clsx(styles.root, isDisabled && styles.disabled, className)}
        >
            <label className={styles.label} htmlFor={inputId}>{label}</label>
            <ReactTags
                id={inputId}
                tags={selectedTags}
                suggestions={suggestions}
                placeholder={placeholder}
                labelField="text"
                inputFieldPosition="inline"
                separators={['Enter']}
                autoFocus={false}
                readOnly={isDisabled}
                allowUnique
                allowDragDrop={false}
                allowAdditionFromPaste={false}
                allowDeleteFromEmptyInput={false}
                handleAddition={handleAddition}
                handleDelete={handleDelete}
                handleInputFocus={() => setIsFocused(true)}
                handleInputBlur={() => setIsFocused(false)}
                shouldRenderSuggestions={() => isFocused}
                removeComponent={RemoveTagButton}
                classNames={{
                    tags: styles.tagsRoot,
                    tagInput: styles.tagInput,
                    tagInputField: styles.input,
                    selected: styles.selected,
                    tag: styles.tag,
                    remove: clsx('ReactTags__remove', styles.removeButton),
                    suggestions: styles.suggestions,
                    activeSuggestion: styles.activeSuggestion,
                }}
            />
        </div>
    );
};
