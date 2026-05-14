import {useExclusiveOverlay} from '@stagistic/editor';
import {clsx} from '@stagistic/ui';
import {
    type ReactNode,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from '../../ScriptEditorRoute.module.css';

export interface SettingsSelectOption {
    value: number | string,
    label: string,
    icon?: ReactNode,
}

interface SettingsSelectProps {
    id?: string,
    value: number | string,
    options: SettingsSelectOption[],
    ariaLabel: string,
    onChange: (value: number | string) => void,
}

export const SettingsSelect = ({
    id,
    value,
    options,
    ariaLabel,
    onChange,
}: SettingsSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement | null>(null);
    const rawId = useId();
    const anchorName = `--ss-${rawId.replace(/[^a-zA-Z0-9]/g, '')}` as const;
    const selectedOption = useMemo(
        () => options.find(option => option.value === value) ?? options[0] ?? null,
        [options, value],
    );

    useExclusiveOverlay(isOpen, () => setIsOpen(false));

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            if (!selectRef.current) {
                return;
            }

            if (selectRef.current.contains(event.target as Node)) {
                return;
            }

            setIsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    return (
        <div className={styles.settingsSelect} ref={selectRef}>
            <button
                id={id}
                type="button"
                className={styles.settingsSelectButton}
                style={{anchorName}}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span className={styles.settingsSelectValue}>
                    {selectedOption?.icon ? (
                        <span className={styles.settingsSelectIcon}>{selectedOption.icon}</span>
                    ) : null}
                    <span className={styles.settingsSelectLabel}>{selectedOption?.label ?? ''}</span>
                </span>
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    className={styles.settingsSelectChevron}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {isOpen ? (
                <div
                    className={styles.settingsSelectMenu}
                    style={{positionAnchor: anchorName}}
                    role="listbox"
                    aria-labelledby={id}
                >
                    {options.map(option => (
                        <button
                            key={String(option.value)}
                            type="button"
                            role="option"
                            aria-selected={option.value === value}
                            className={clsx(
                                styles.settingsSelectItem,
                                option.value === value && styles.settingsSelectItemActive,
                            )}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            <span className={styles.settingsSelectItemValue}>
                                {option.icon ? (
                                    <span className={styles.settingsSelectIcon}>{option.icon}</span>
                                ) : null}
                                <span className={styles.settingsSelectItemLabel}>{option.label}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
};
