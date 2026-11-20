import clsx from 'clsx';
import {
    Fragment,
    type MouseEvent,
    type ReactNode,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';

import {useAnchoredMenuPlacement} from '../shared/useAnchoredMenuHeight';
import {useDropdownDismiss} from '../shared/useDropdownDismiss';
import styles from './Select.module.css';

export interface SelectOption {
    value: number | string,
    label: string,
    icon?: ReactNode,
    /** Draws a separator line above this option, e.g. before a trailing action. */
    dividerBefore?: boolean,
    /** Shown for information only: not focusable, no hover, cannot be chosen. */
    isDisabled?: boolean,
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
    width?: 'full' | 'content',
    variant?: 'panel' | 'plain' | 'form',
    size?: 'sm' | 'md' | 'lg',
    /** Pin the menu to one edge of the trigger and let it grow. Omit to match the trigger's width exactly. */
    align?: 'end' | 'start',
    /** Name the listbox itself when the trigger's own label is not the right name for it. */
    menuAriaLabel?: string,
    /**
     * Open and choose on `mousedown` with the default prevented, so focus stays where it is.
     * Set only where moving focus would tear down the caller's selection — the editor chrome.
     */
    preserveFocus?: boolean,
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
    width = 'full',
    variant = 'plain',
    size = 'md',
    align,
    menuAriaLabel,
    preserveFocus = false,
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
    const menuRef = useRef<HTMLDivElement | null>(null);
    const rawId = useId();
    const anchorName = `--select-${rawId.replace(/[^a-zA-Z0-9]/g, '')}` as const;
    const selectedOption = useMemo(() => options.find(option => option.value === value) ?? options[0] ?? null, [options, value]);
    const menuPlacement = useAnchoredMenuPlacement({
        anchorRef: selectRef,
        menuRef,
        isOpen,
    });

    useDropdownDismiss(isOpen, setIsOpen, selectRef);

    const activate = (run: () => void) => {
        if (!preserveFocus) {
            return {onClick: run};
        }

        return {
            onMouseDown: (event: MouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                run();
            },
        };
    };

    return (
        <div
            className={clsx(
                styles.select,
                width === 'content' && styles.content,
                variant === 'panel' && styles.panel,
                variant === 'form' && styles.form,
                variant === 'form' && styles[size],
                className,
            )}
            ref={selectRef}
            data-menu-placement={isOpen ? menuPlacement.placement : undefined}
        >
            {width === 'content' ? (
                <span
                    className={styles.sizer}
                    aria-hidden="true"
                >
                    {options.map(option => (
                        <span
                            key={String(option.value)}
                            className={styles.sizerLabel}
                        >
                            {option.label}
                        </span>
                    ))}
                    <span className={styles.sizerChevron} />
                </span>
            ) : null}
            <button
                id={id}
                type="button"
                className={styles.button}
                style={{anchorName}}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                {...activate(() => setIsOpen(!isOpen))}
            >
                <span className={styles.value}>
                    {selectedOption?.icon ? <span className={styles.icon}>{selectedOption.icon}</span> : null}
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
                    ref={menuRef}
                    className={clsx(
                        styles.menu,
                        align === 'start' && styles.menuStart,
                        align === 'end' && styles.menuEnd,
                        menuPlacement.placement === 'above' && styles.above,
                    )}
                    style={{
                        positionAnchor: anchorName,
                        ...menuPlacement.style,
                    }}
                    role="listbox"
                    aria-label={menuAriaLabel}
                    aria-labelledby={id}
                >
                    {options.map(option => {
                        const content = (
                            <span className={styles.itemValue}>
                                {option.icon ? <span className={styles.icon}>{option.icon}</span> : null}
                                <span className={styles.itemLabel}>{option.label}</span>
                            </span>
                        );

                        return (
                            <Fragment key={String(option.value)}>
                                {option.dividerBefore ? <div className={styles.divider} aria-hidden="true" /> : null}
                                {option.isDisabled ? (
                                    <div
                                        role="option"
                                        aria-selected={option.value === value}
                                        aria-disabled="true"
                                        className={styles.itemStatic}
                                    >
                                        {content}
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        role="option"
                                        aria-selected={option.value === value}
                                        className={clsx(styles.item, option.value === value && styles.itemActive)}
                                        {...activate(() => {
                                            onChange(option.value);
                                            setIsOpen(false);
                                        })}
                                    >
                                        {content}
                                    </button>
                                )}
                            </Fragment>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
};

Select.displayName = 'Select';
