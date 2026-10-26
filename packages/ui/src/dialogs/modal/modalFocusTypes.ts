import type {RefObject} from 'react';

export type ModalFocusTarget = HTMLElement | RefObject<HTMLElement | null> | (() => HTMLElement | null) | null;

export interface ModalFocusRestoreOptions {
    returnFocus?: ModalFocusTarget,
    fallbackFocus?: ModalFocusTarget,
}

export type ModalInitialFocusTarget = ModalFocusTarget | ((dialog: HTMLDialogElement) => HTMLElement | null);
