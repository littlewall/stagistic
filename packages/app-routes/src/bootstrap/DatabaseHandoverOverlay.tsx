import {
    type DatabaseHandover,
    type DatabaseHandoverState,
    useDatabaseHandover,
} from '@stagistic/app-core';
import {
    Button,
    ModalActions,
    ModalDialog,
    ModalHeader,
} from '@stagistic/ui';
import {
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';

import {reloadPage} from '../shared/reloadPage';
import styles from './DatabaseHandoverOverlay.module.css';

const keepOpen = () => {};

const ReloadButton = ({
    onReload,
    variant,
    label = 'Reload',
}: {
    onReload: () => void,
    variant?: 'ghost',
    label?: string,
}) => (
    <Button variant={variant} onPress={onReload}>{label}</Button>
);

export const TextRescue = ({
    text,
    onReload,
    reloadLabel = 'Reload',
}: {
    text: string,
    onReload: () => void,
    reloadLabel?: string,
}) => {
    const textRef = useRef<HTMLTextAreaElement>(null);
    const [isCopied, setIsCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
        } catch {
            // The clipboard needs permission and focus; selected text can still be copied by hand.
            textRef.current?.focus();
            textRef.current?.select();
        }
    };

    return (
        <>
            <textarea
                ref={textRef}
                aria-label="Your text"
                className={styles.text}
                readOnly
                value={text}
            />
            <ModalActions>
                <Button data-modal-initial-focus onPress={() => void copy()}>{isCopied ? 'Copied' : 'Copy text'}</Button>
                <ReloadButton onReload={onReload} variant="ghost" label={reloadLabel} />
            </ModalActions>
        </>
    );
};

const describeState = (state: Exclude<DatabaseHandoverState, {status: 'idle'}>) => {
    if (state.status === 'saving') {
        return {
            title: 'Saving your work',
            description: 'A newer Release of Stagistic opened in another tab or window and needs your scripts.',
        };
    }

    if (state.status === 'saved') {
        return {
            title: 'Stagistic has been updated',
            description: 'A newer Release opened in another tab or window and now holds your scripts. '
                + 'Your work is saved. Reload to continue here.',
        };
    }

    if (state.status === 'database-lost') {
        return {
            title: 'This tab lost access to your scripts',
            description: state.text
                ? 'Another tab closed and this one could not take over. Copy your text before you reload: '
                    + 'changes since your last save exist only here.'
                : 'Another tab closed and this one could not take over. Reload to continue.',
        };
    }

    return {
        title: 'Your latest changes could not be saved',
        description: state.text
            ? 'A newer Release of Stagistic opened in another tab or window, but this tab could not save. '
                + 'Copy your text before you reload: it exists only here.'
            : 'A newer Release of Stagistic opened in another tab or window, but this tab could not confirm its last save.',
    };
};

const HandoverDialog = ({handover, onReload}: {handover: DatabaseHandover, onReload: () => void}) => {
    const state = useSyncExternalStore(handover.subscribe, handover.getState);

    if (state.status === 'idle') {
        return null;
    }

    const {title, description} = describeState(state);

    return (
        <ModalDialog
            ariaLabel={title}
            isOpen
            onClose={keepOpen}
        >
            <ModalHeader title={title} description={description} />
            {state.status !== 'saving' && state.status !== 'saved' && state.text
                ? <TextRescue text={state.text} onReload={onReload} />
                : state.status !== 'saving' && <ModalActions spacing="lg"><ReloadButton onReload={onReload} /></ModalActions>}
        </ModalDialog>
    );
};

/**
 * Covers the app once a newer Release needs the database, or once this tab
 * could not take the database over. Stays up for good: such a tab has nothing
 * left to work with, so the only way on is a reload.
 */
export const DatabaseHandoverOverlay = ({onReload = reloadPage}: {onReload?: () => void}) => {
    const handover = useDatabaseHandover();

    return handover ? <HandoverDialog handover={handover} onReload={onReload} /> : null;
};
