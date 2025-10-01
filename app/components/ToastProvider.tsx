import React, {
    createContext, ReactNode, useCallback, useContext, useState,
} from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
    id: string,
    message: string,
    type: ToastType,
}

interface ToastContextType {
    toasts: Toast[],
    showToast: (message: string, type?: ToastType) => void,
    removeToast: (id: string) => void,
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({children}: {children: ReactNode}) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);

        setToasts(ts => [
            ...ts, {
                id, message, type,
            },
        ]);
        setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(ts => ts.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{
            toasts, showToast, removeToast,
        }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);

    if (!ctx) throw new Error('useToast must be used within ToastProvider');

    return ctx;
};

export const ToastContainer = () => {
    const {toasts, removeToast} = useToast();

    return (
        <div style={{
            position: 'fixed', top: 20, right: 20, zIndex: 9999,
        }}>
            {toasts.map(t => (
                <div key={t.id} style={{
                    marginBottom: 12,
                    padding: '12px 20px',
                    borderRadius: 8,
                    background: t.type === 'error' ? '#ffeded' : t.type === 'success' ? '#e6ffed' : '#f0f0f0',
                    color: t.type === 'error' ? '#c00' : t.type === 'success' ? '#0a0' : '#333',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    minWidth: 220,
                    cursor: 'pointer',
                }} onClick={() => removeToast(t.id)}>
                    {t.message}
                </div>
            ))}
        </div>
    );
};
