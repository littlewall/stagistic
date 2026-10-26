import type {
    ModalFocusRestoreOptions,
    ModalFocusTarget,
    ModalInitialFocusTarget,
} from './modalFocusTypes';

const FOCUSABLE_SELECTOR = 'button, input, select, textarea, a[href], summary, [tabindex], [contenteditable="true"]';
const TEXT_FIELD_SELECTOR = 'input:not([type="hidden"], [type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"]), textarea, select, [contenteditable="true"]';

export const resolveModalFocusTarget = (target?: ModalFocusTarget): HTMLElement | null => {
    if (!target) {
        return null;
    }

    if (typeof target === 'function') {
        return target();
    }

    return target instanceof HTMLElement ? target : target.current;
};

const isAvailable = (element: HTMLElement | null): element is HTMLElement => Boolean(
    element?.isConnected
    && !element.closest('[hidden], [inert], [aria-hidden="true"]')
    && !element.matches(':disabled, [aria-disabled="true"]')
    && element.getClientRects().length
    && !['hidden', 'collapse'].includes(getComputedStyle(element).visibility),
);

export const getModalTabStops = (dialog: HTMLDialogElement) => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter(element => element.tabIndex >= 0 && element.closest('dialog') === dialog && isAvailable(element));

const focusElement = (element: HTMLElement | null) => {
    if (!isAvailable(element)) {
        return false;
    }

    if (document.activeElement === element) {
        return true;
    }

    const temporaryTabIndex = !element.matches(`${FOCUSABLE_SELECTOR}, dialog`);

    if (temporaryTabIndex) {
        element.setAttribute('tabindex', '-1');
    }

    element.focus({preventScroll: true});

    if (temporaryTabIndex && document.activeElement === element) {
        // Removing tabindex while focused blurs generic containers in Chromium.
        element.addEventListener('blur', () => {
            if (element.getAttribute('tabindex') === '-1') {
                element.removeAttribute('tabindex');
            }
        }, {once: true});
    } else if (temporaryTabIndex) {
        element.removeAttribute('tabindex');
    }

    return document.activeElement === element;
};

export const focusModalInitial = (
    dialog: HTMLDialogElement,
    target?: ModalInitialFocusTarget,
    select = false,
) => {
    const explicitTarget = typeof target === 'function' ? target(dialog) : resolveModalFocusTarget(target);
    const candidates = [
        explicitTarget,
        ...dialog.querySelectorAll<HTMLElement>('[data-modal-initial-focus]'),
        ...dialog.querySelectorAll<HTMLElement>(TEXT_FIELD_SELECTOR),
        ...getModalTabStops(dialog).filter(element => !element.matches('[data-modal-close], [aria-label^="Close"]')),
        dialog,
    ];
    const focused = candidates.find(element => element && dialog.contains(element) && focusElement(element));

    if (select && (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) {
        focused.select();
    }
};

export interface ModalFocusSession {
    hasExplicitTarget: boolean,
    returnTarget: HTMLElement | null,
    fallbackFocus?: ModalFocusTarget,
    parentDialog: HTMLDialogElement | null,
    container: HTMLElement | null,
}

export const createModalFocusSession = (dialog: HTMLDialogElement, options: ModalFocusRestoreOptions): ModalFocusSession => ({
    hasExplicitTarget: options.returnFocus !== undefined || options.fallbackFocus !== undefined,
    returnTarget: resolveModalFocusTarget(options.returnFocus),
    fallbackFocus: options.fallbackFocus,
    parentDialog: dialog.parentElement?.closest<HTMLDialogElement>('dialog[open]') ?? null,
    container: dialog.parentElement?.closest<HTMLElement>('[data-modal-focus-fallback]') ?? null,
});

export const restoreModalFocus = (dialog: HTMLDialogElement, session: ModalFocusSession) => {
    const active = document.activeElement;

    // Without an explicit override, retain successful native restoration.
    if (!session.hasExplicitTarget && active instanceof HTMLElement && active !== document.body
        && !dialog.contains(active) && isAvailable(active)) {
        return true;
    }

    const parent = session.parentDialog?.open ? session.parentDialog : null;
    const main = document.querySelector<HTMLElement>('[data-modal-focus-fallback], main');
    const candidates = [
        session.returnTarget,
        resolveModalFocusTarget(session.fallbackFocus),
        parent?.querySelector<HTMLElement>('[aria-current="page"], [data-modal-initial-focus]') ?? null,
        parent,
        ...document.querySelectorAll<HTMLElement>('[contenteditable="true"]'),
        session.container,
        main,
    ];

    return candidates.some(element => {
        if (!element || dialog.contains(element)) {
            return false;
        }

        // A newly opened dialog owns focus; closing the previous one must not steal it.
        const activeDialog = document.activeElement?.closest('dialog[open]');

        if (activeDialog && !activeDialog.contains(element)) {
            return false;
        }

        return focusElement(element);
    });
};
