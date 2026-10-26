import {useEffect} from 'react';

const FOCUS_VISIBLE_ATTRIBUTE = 'data-focus-ring-visible';
const NAVIGATION_KEYS = new Set([
    'Tab',
    'ArrowUp',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'Home',
    'End',
]);

const isTextEntry = (target: EventTarget | null) => target instanceof HTMLElement && (
    target.isContentEditable
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLInputElement && ![
        'button',
        'checkbox',
        'radio',
        'range',
        'submit',
        'reset',
        'image',
        'color',
    ].includes(target.type))
);

export const FocusVisibilityManager = () => {
    useEffect(() => {
        const root = document.documentElement;
        let navigationOrigin: Element | null = null;
        let navigationEvent: KeyboardEvent | null = null;
        let expiryFrame: number | null = null;
        const clearNavigation = () => {
            navigationOrigin = null;
            navigationEvent = null;
            observer.disconnect();

            if (expiryFrame !== null) {
                cancelAnimationFrame(expiryFrame);
                expiryFrame = null;
            }
        };
        const showRing = () => {
            root.setAttribute(FOCUS_VISIBLE_ATTRIBUTE, '');
            clearNavigation();
        };
        const handleVirtualFocus = (records: MutationRecord[]) => {
            if (!navigationOrigin) {
                return;
            }

            const moved = records.some(record => {
                const target = record.target;

                if (!(target instanceof Element)) {
                    return false;
                }

                if (record.attributeName === 'data-focused') {
                    return record.oldValue === null && target.hasAttribute('data-focused');
                }

                const activeId = target.getAttribute('aria-activedescendant');

                return target === document.activeElement && Boolean(activeId && activeId !== record.oldValue && document.getElementById(activeId));
            });

            if (moved) {
                showRing();
            }
        };
        // Observe virtual focus only while a navigation key is pending.
        const observer = new MutationObserver(handleVirtualFocus);
        const handleKeyDown = (event: KeyboardEvent) => {
            clearNavigation();

            if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey || !NAVIGATION_KEYS.has(event.key)) {
                return;
            }

            if (event.key !== 'Tab' && isTextEntry(event.target)) {
                return;
            }

            navigationOrigin = document.activeElement;
            navigationEvent = event;
            observer.observe(document.body, {
                subtree: true,
                attributes: true,
                attributeOldValue: true,
                attributeFilter: ['aria-activedescendant', 'data-focused'],
            });
        };
        const handleFocusIn = (event: FocusEvent) => {
            if (navigationOrigin && event.target !== navigationOrigin) {
                showRing();
            }
        };
        const handleKeyUp = () => {
            handleVirtualFocus(observer.takeRecords());

            /*
             * A one-control dialog wraps Tab back onto the same control, so no
             * focusin fires. This is navigation; Tab consumed by an editor isn't.
             */
            if (navigationEvent?.key === 'Tab' && navigationEvent.defaultPrevented
                && navigationOrigin instanceof HTMLElement && !navigationOrigin.isContentEditable
                && navigationOrigin === document.activeElement
                && navigationOrigin.closest('dialog[open], [role="dialog"], [role="alertdialog"]')) {
                showRing();

                return;
            }

            /*
             * Custom menus focus newly rendered submenus in an animation frame.
             * Unhandled keys and editor-consumed Tab expire at keyup instead.
             */
            if (navigationEvent?.defaultPrevented && !isTextEntry(navigationOrigin)) {
                expiryFrame = requestAnimationFrame(clearNavigation);

                return;
            }

            clearNavigation();
        };
        const handlePointerDown = () => {
            clearNavigation();
            root.removeAttribute(FOCUS_VISIBLE_ATTRIBUTE);
        };

        root.removeAttribute(FOCUS_VISIBLE_ATTRIBUTE);
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keyup', handleKeyUp, true);
        document.addEventListener('focusin', handleFocusIn, true);
        document.addEventListener('pointerdown', handlePointerDown, true);
        window.addEventListener('blur', clearNavigation);

        return () => {
            clearNavigation();
            root.removeAttribute(FOCUS_VISIBLE_ATTRIBUTE);
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('keyup', handleKeyUp, true);
            document.removeEventListener('focusin', handleFocusIn, true);
            document.removeEventListener('pointerdown', handlePointerDown, true);
            window.removeEventListener('blur', clearNavigation);
        };
    }, []);

    return null;
};
