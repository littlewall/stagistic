import clsx from 'clsx';
import {
    type ReactNode,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from './Select.module.css';

export interface SelectOption {
    value: number | string,
    label: string,
    icon?: ReactNode,
}

interface SelectProps {
    id?: string,
    value: number | string,
    options: SelectOption[],
    ariaLabel: string,
    onChange: (value: number | string) => void,
    className?: string,
    isOpen?: boolean,
    onIsOpenChange?: (isOpen: boolean) => void,
}

export const Select = ({
    id,
    value,
    options,
    ariaLabel,
    onChange,
    className,
    isOpen: controlledIsOpen,
    onIsOpenChange,
}: SelectProps) => {
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
    const setIsOpen = (next: boolean) => {
        if (isControlled) {
            onIsOpenChange?.(next);
        } else {
            setInternalIsOpen(next);
        }
    };

    const selectRef = useRef<HTMLDivElement | null>(null);
    const rawId = useId();
    const anchorName = `--select-${rawId.replace(/[^a-zA-Z0-9]/g, '')}` as const;
    const selectedOption = useMemo(
        () => options.find(option => option.value === value) ?? options[0] ?? null,
        [options, value],
    );

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
        <div className={clsx(styles.select, className)} ref={selectRef}>
            <button
                id={id}
                type="button"
                className={styles.button}
                style={{anchorName}}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={styles.value}>
                    {selectedOption?.icon ? (
                        <span className={styles.icon}>{selectedOption.icon}</span>
                    ) : null}
                    <span className={styles.label}>{selectedOption?.label ?? ''}</span>
                </span>
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    className={styles.chevron}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {isOpen ? (
                <div
                    className={styles.menu}
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
                                styles.item,
                                option.value === value && styles.itemActive,
                            )}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            <span className={styles.itemValue}>
                                {option.icon ? (
                                    <span className={styles.icon}>{option.icon}</span>
                                ) : null}
                                <span className={styles.itemLabel}>{option.label}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

Select.displayName = 'Select';
