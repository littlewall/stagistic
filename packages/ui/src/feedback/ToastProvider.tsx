import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useMemo,
} from 'react';
import {
    Button,
    type QueuedToast,
    Text,
    type ToastOptions,
    UNSTABLE_Toast as Toast,
    UNSTABLE_ToastContent as ToastContent,
    UNSTABLE_ToastList as ToastList,
    UNSTABLE_ToastQueue as ToastQueue,
    UNSTABLE_ToastRegion as ToastRegion,
} from 'react-aria-components';

import {CloseIcon} from '../icons/ui';
import styles from './ToastProvider.module.css';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastContent = {
    title: string,
    description?: string,
    variant?: ToastVariant,
};

type ToastContextValue = {
    addToast: (content: ToastContent, options?: ToastOptions) => string,
};

const ToastContext = createContext<ToastContextValue | null>(null);
const toastQueue = new ToastQueue<ToastContent>({maxVisibleToasts: 3});

const ToastItem = ({toast}: {toast: QueuedToast<ToastContent>}) => {
    const variant = useMemo(() => toast.content.variant ?? 'info', [toast.content.variant]);

    return (
        <Toast
            toast={toast}
            className={styles.toast}
            data-variant={variant}
        >
            <span className={styles.statusIndicator} aria-hidden="true" />
            <ToastContent className={styles.content}>
                <Text slot="title" className={styles.title}>
                    {toast.content.title}
                </Text>
                {toast.content.description && (
                    <Text slot="description" className={styles.description}>
                        {toast.content.description}
                    </Text>
                )}
            </ToastContent>
            <Button
                slot="close"
                className={styles.closeButton}
                aria-label="Zavřít oznámení"
            >
                <CloseIcon />
            </Button>
        </Toast>
    );
};

export const ToastProvider = ({children}: {children: ReactNode}) => {
    const addToast = useCallback(
        (content: ToastContent, options?: ToastOptions) => toastQueue.add(content, {
            timeout: 4000,
            ...options,
        }),
        [],
    );

    const value = useMemo(() => ({addToast}), [addToast]);
    const renderToast = useCallback(
        ({toast}: {toast: QueuedToast<ToastContent>}) => (
            <ToastItem toast={toast} />
        ),
        [],
    );

    return (
        <ToastContext.Provider value={value}>
            {children}
            <ToastRegion
                queue={toastQueue}
                className={styles.region}
                aria-label="Notifications"
            >
                <ToastList className={styles.list}>
                    {renderToast}
                </ToastList>
            </ToastRegion>
        </ToastContext.Provider>
    );
};

export const useToastController = () => {
    const context = useContext(ToastContext);

    if (!context) {
        throw new Error('useToastController must be used within ToastProvider');
    }

    return context;
};
