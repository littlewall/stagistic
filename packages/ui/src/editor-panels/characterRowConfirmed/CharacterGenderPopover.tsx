import {
    Button,
    Dialog,
    DialogTrigger,
    Input,
    ListBox,
    ListBoxItem,
    Popover,
} from 'react-aria-components';

import styles from '../EditorSidebar.module.css';
import {UNSPECIFIED_GENDER_KEY} from './constants';
import type {
    CharacterGenderIcon,
    GenderListOption,
} from './types';

interface CharacterGenderPopoverProps {
    model: {
        characterKey: string,
    },
    state: {
        isOpen: boolean,
        isGenderActionDisabled: boolean,
        selectedGenderLabel: string,
        selectedGenderIcon: CharacterGenderIcon,
        genderQuery: string,
        effectiveGenderKey: string | null,
        normalizedGenderInputLabel: string,
        canCreateCustomGender: boolean,
    },
    data: {
        genderListOptions: GenderListOption[],
    },
    actions: {
        onOpenChange: (nextOpen: boolean) => void,
        onGenderQueryChange: (value: string) => void,
        shouldCloseGenderPopover: (target: Element) => boolean,
        onCommitGenderQuery: () => Promise<boolean>,
        onGenderSelection: (nextKey: string) => void,
    },
}

export const CharacterGenderPopover = ({
    model,
    state,
    data,
    actions,
}: CharacterGenderPopoverProps) => {
    const {characterKey} = model;
    const {
        isOpen,
        isGenderActionDisabled,
        selectedGenderLabel,
        selectedGenderIcon,
        genderQuery,
        effectiveGenderKey,
        normalizedGenderInputLabel,
        canCreateCustomGender,
    } = state;
    const {genderListOptions} = data;
    const {
        onOpenChange,
        onGenderQueryChange,
        shouldCloseGenderPopover,
        onCommitGenderQuery,
        onGenderSelection,
    } = actions;

    return (
        <DialogTrigger
            isOpen={isOpen}
            onOpenChange={onOpenChange}
        >
            <Button
                className={styles.genderIconButton}
                aria-label={`Set gender for ${characterKey}. Current value: ${selectedGenderLabel}`}
                isDisabled={isGenderActionDisabled}
            >
                {selectedGenderIcon === 'male' ? (
                    <svg
                        viewBox="0 0 24 24"
                        className={styles.iconGlyph}
                        aria-hidden="true"
                    >
                        <path d="M10 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
                        <path d="M14 5h5v5" />
                        <path d="m13 11 6-6" />
                    </svg>
                ) : null}
                {selectedGenderIcon === 'female' ? (
                    <svg
                        viewBox="0 0 24 24"
                        className={styles.iconGlyph}
                        aria-hidden="true"
                    >
                        <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
                        <path d="M12 12v7" />
                        <path d="M9 16h6" />
                    </svg>
                ) : null}
                {selectedGenderIcon === 'neutral' ? (
                    <svg
                        viewBox="0 0 24 24"
                        className={styles.iconGlyph}
                        aria-hidden="true"
                    >
                        <path d="M12 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z" />
                        <path d="M7 20c1.5-2.2 3.2-3.3 5-3.3s3.5 1.1 5 3.3" />
                    </svg>
                ) : null}
            </Button>
            <Popover
                placement="bottom start"
                offset={6}
                className={styles.characterGenderPickerPopover}
                shouldCloseOnInteractOutside={shouldCloseGenderPopover}
            >
                <Dialog
                    className={styles.characterGenderPickerDialog}
                    aria-label={`Gender picker for ${characterKey}`}
                >
                    <span className={styles.characterGenderPickerHeading}>Gender</span>
                    <Input
                        className={styles.characterGenderQueryInput}
                        value={genderQuery}
                        placeholder="Add custom gender..."
                        aria-label={`Add custom gender for ${characterKey}`}
                        onChange={event => {
                            onGenderQueryChange(event.target.value);
                        }}
                        onKeyDown={event => {
                            event.stopPropagation();

                            if (event.key === 'Enter') {
                                event.preventDefault();
                                void onCommitGenderQuery();
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault();
                                onGenderQueryChange('');
                                onOpenChange(false);
                            }
                        }}
                    />
                    <span className={styles.characterGenderHint}>Enter to add custom gender</span>
                    <ListBox<GenderListOption>
                        className={styles.characterGenderListBox}
                        items={genderListOptions}
                        selectedKeys={[effectiveGenderKey ?? UNSPECIFIED_GENDER_KEY]}
                        selectionMode="single"
                        onAction={key => {
                            onGenderSelection(String(key));
                        }}
                        onSelectionChange={selection => {
                            if (selection === 'all') {
                                return;
                            }

                            const [selectedKey] = Array.from(selection);

                            if (!selectedKey) {
                                return;
                            }

                            onGenderSelection(String(selectedKey));
                        }}
                    >
                        {(item: GenderListOption) => (
                            <ListBoxItem
                                id={item.key}
                                textValue={item.label}
                                className={styles.characterGenderOption}
                            >
                                {(item.key === effectiveGenderKey) || (item.isUnspecified && !effectiveGenderKey) ? (
                                    <span className={styles.characterGenderCheckmark} aria-hidden="true">
                                        <svg viewBox="0 0 24 24" className={styles.iconGlyph}>
                                            <path d="m5 12 4 4L19 6" />
                                        </svg>
                                    </span>
                                ) : (
                                    <span className={styles.characterGenderCheckmark} aria-hidden="true" />
                                )}
                                <span>{item.label}</span>
                            </ListBoxItem>
                        )}
                    </ListBox>
                    {canCreateCustomGender ? (
                        <Button
                            className={styles.characterGenderCreateButton}
                            onPress={() => {
                                void onCommitGenderQuery();
                            }}
                        >
                            Add &quot;{normalizedGenderInputLabel}&quot;
                        </Button>
                    ) : null}
                </Dialog>
            </Popover>
        </DialogTrigger>
    );
};
