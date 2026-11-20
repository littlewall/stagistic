import clsx from 'clsx';
import type {ReactNode, Ref} from 'react';
import {
    Button as RACButton,
    Dialog,
    DialogTrigger,
    Popover,
} from 'react-aria-components';

import {ChevronDownIcon} from '../icons/ui';
import styles from './BoardMenuButton.module.css';

export interface BoardMenuButtonProps {
    /** Accessible name of the panel; also the button's name unless `label` says otherwise. */
    panelLabel: string,
    /** Overrides the button's accessible name when its content is only dots or a bare name. */
    label?: string,
    /** Chosen state (Creamed Corn): the panel holds a non-default setting. */
    isActive?: boolean,
    /** Drops its own chrome so a surrounding group can carry it. */
    isGrouped?: boolean,
    /** Keeps empty room before the caret, for a sibling control the group places there. */
    hasTrailingSlot?: boolean,
    triggerRef?: Ref<HTMLButtonElement>,
    onOpenChange?: (isOpen: boolean) => void,
    /** Button content, before the caret. */
    children: ReactNode,
    panel: ReactNode,
}

/** Text button with a caret that opens a non-modal panel of controls below it. */
export const BoardMenuButton = ({
    panelLabel,
    label,
    isActive = false,
    isGrouped = false,
    hasTrailingSlot = false,
    triggerRef,
    onOpenChange,
    children,
    panel,
}: BoardMenuButtonProps) => (
    <DialogTrigger onOpenChange={onOpenChange}>
        <RACButton
            ref={triggerRef}
            aria-label={label}
            className={clsx(styles.button, isActive && !isGrouped && styles.active, isGrouped && styles.grouped)}
        >
            {children}
            {hasTrailingSlot ? <span className={styles.slot} aria-hidden="true" /> : null}
            <ChevronDownIcon className={styles.caret} aria-hidden="true" />
        </RACButton>
        <Popover
            className={styles.popover}
            placement="bottom end"
            offset={6}
        >
            <Dialog className={styles.dialog} aria-label={panelLabel}>
                {panel}
            </Dialog>
        </Popover>
    </DialogTrigger>
);
