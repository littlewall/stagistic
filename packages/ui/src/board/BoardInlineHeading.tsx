import clsx from 'clsx';
import {
    type KeyboardEvent,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import {flushSync} from 'react-dom';

import styles from './BoardInlineHeading.module.css';

/* Names are one line with single spaces: line breaks and the browser's non-breaking spaces count as spaces too. */
const toPlainName = (text: string) => text.replaceAll(/\s+/g, ' ');

/* An outline keeps its lines; only the browser's non-breaking spaces and carriage returns are normalized. */
const toPlainLines = (text: string) => text.replaceAll('\u00A0', ' ').replaceAll(/\r\n?/g, '\n');

const selectContents = (element: HTMLElement) => {
    const range = document.createRange();

    range.selectNodeContents(element);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
};

type CaretDocument = Document & {caretRangeFromPoint?: (x: number, y: number) => Range | null};

/* The caret where the name was clicked; at its end when the browser cannot tell. */
const placeCaretAt = (element: HTMLElement, x: number, y: number) => {
    const position = document.caretPositionFromPoint?.(x, y);
    const legacy = position ? null : (document as CaretDocument).caretRangeFromPoint?.(x, y);
    const node = position?.offsetNode ?? legacy?.startContainer;
    const range = document.createRange();

    if (node && element.contains(node)) {
        range.setStart(node, position?.offset ?? legacy?.startOffset ?? 0);
    } else {
        range.selectNodeContents(element);
    }

    range.collapse(Boolean(node && element.contains(node)));
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
};

const insertPlainText = (text: string) => {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

    if (!selection || !range) return;

    const node = document.createTextNode(text);

    range.deleteContents();
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
};

/*
 * A Board name edited where it stands: the text itself becomes editable, so the layout
 * never shifts, and a tint marks the edit. React never renders the text as children; the
 * browser owns it while editing and it is written back from `value` otherwise. Enter or
 * leaving the field saves, Escape cancels. An outline has several lines: Enter breaks the
 * line and Cmd/Ctrl+Enter saves.
 */
export const BoardInlineHeading = ({
    value,
    label,
    kind,
    onCommit,
    placeholder,
    isReadOnly = false,
    startEditing = false,
}: {
    value: string,
    label: string,
    kind: 'scene' | 'act' | 'outline',
    /** Shown in an empty field while the card is pointed at or focused. */
    placeholder?: string,
    startEditing?: boolean,
    onCommit: (value: string) => boolean,
    isReadOnly?: boolean,
}) => {
    const field = useRef<HTMLSpanElement>(null);
    const pressedAt = useRef<{x: number, y: number} | null>(null);
    // Only the first render may start editing; later renders keep whatever the user did.
    const [startsEditing] = useState(startEditing && !isReadOnly);
    const [isEditing, setEditing] = useState(startsEditing);
    const isMultiline = kind === 'outline';
    const toPlain = isMultiline ? toPlainLines : toPlainName;

    useLayoutEffect(() => {
        const element = field.current;

        if (element && !(isEditing && document.activeElement === element)) element.textContent = value;
    }, [isEditing, value]);

    // A space at the start of the name, or next to another space, is not typed at all.
    useEffect(() => {
        const element = field.current;

        if (!isEditing || !element || isMultiline) return;

        const onBeforeInput = (event: InputEvent) => {
            const selection = window.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;

            if (event.inputType !== 'insertText' || event.data !== ' ' || !range) return;

            const before = document.createRange();
            const after = document.createRange();

            before.selectNodeContents(element);
            before.setEnd(range.startContainer, range.startOffset);
            after.selectNodeContents(element);
            after.setStart(range.endContainer, range.endOffset);

            if (!(/\S$/).test(before.toString()) || (/^\s/).test(after.toString())) event.preventDefault();
        };

        element.addEventListener('beforeinput', onBeforeInput);

        return () => element.removeEventListener('beforeinput', onBeforeInput);
    }, [isEditing, isMultiline]);

    useEffect(() => {
        const element = field.current;

        if (!startsEditing || !element) return;

        element.focus();
        selectContents(element);
    }, [startsEditing]);

    if (isReadOnly) return <span className={clsx(isMultiline && styles.lines)}>{value}</span>;

    const draft = () => toPlain(field.current?.textContent ?? '').trim();

    const finish = (commit: boolean) => {
        const element = field.current;

        if (!element) return;

        const next = draft();
        const accepted = commit && next !== value && (kind !== 'scene' || next !== '') && onCommit(next);

        if (!accepted) element.textContent = value;

        window.getSelection()?.removeAllRanges();
        setEditing(false);
    };

    const startEdit = () => {
        flushSync(() => setEditing(true));
    };

    const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
        if (event.nativeEvent.isComposing) return;

        if (!isEditing) {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'F2') {
                event.preventDefault();
                startEdit();

                if (field.current) selectContents(field.current);
            }

            return;
        }

        if (event.key === 'Enter' && isMultiline && !(event.metaKey || event.ctrlKey)) return;

        if (event.key === 'Enter') {
            event.preventDefault();

            if (kind !== 'scene' || draft()) finish(true);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            finish(false);
        }
    };

    return (
        // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- The role switches between button and textbox, which the rule cannot read.
        <span
            ref={field}
            role={isEditing ? 'textbox' : 'button'}
            tabIndex={0}
            aria-label={label}
            contentEditable={isEditing ? 'plaintext-only' : undefined}
            spellCheck={false}
            aria-multiline={isMultiline || undefined}
            data-board-name={kind}
            data-placeholder={placeholder}
            className={clsx(styles.field, isMultiline && styles.multiline, isEditing && styles.editing)}
            // Editing starts on a click, not a press: pressing and moving drags the card instead.
            onPointerDown={event => {
                pressedAt.current = isEditing ? null : {x: event.clientX, y: event.clientY};
            }}
            onClick={event => {
                const pressed = pressedAt.current;

                pressedAt.current = null;

                if (isEditing || !pressed || Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) > 4) return;

                startEdit();
                field.current?.focus();

                if (field.current) placeCaretAt(field.current, event.clientX, event.clientY);
            }}
            onKeyDown={onKeyDown}
            onBlur={() => {
                if (isEditing) finish(true);
            }}
            onInput={event => {
                if (!event.currentTarget.textContent) event.currentTarget.replaceChildren();
            }}
            onPaste={event => {
                event.preventDefault();
                insertPlainText(toPlain(event.clipboardData.getData('text/plain')));
            }}
        />
    );
};
