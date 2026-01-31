import {
    AppHeader,
    AppLayout,
} from '@stagistic/ui';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {NewScriptModal} from '~components/NewScriptModal';
import {useToastController} from '~components/ToastProvider';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '~constants/menuEvents';
import {useScripts} from '~hooks/useScripts';

import styles from './ScriptLlstRoute.module.css';

const mockMeta = [
    {
        id: '1', updated: 'Edited today', status: 'Draft',
    },
    {
        id: '2', updated: 'Edited yesterday', status: 'Outline',
    },
    {
        id: '3', updated: 'Edited last week', status: 'In progress',
    },
    {
        id: '4', updated: 'Edited 2 weeks ago', status: 'Concept',
    },
    {
        id: '5', updated: 'Edited this month', status: 'Draft',
    },
    {
        id: '6', updated: 'Edited this month', status: 'Draft',
    },
];

export const ScriptListRoute = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [storageError, setStorageError] = useState<string | null>(null);
    const {scripts, createScript} = useScripts();
    const {addToast} = useToastController();

    useEffect(() => {
        const handleNewScript = () => {
            setIsModalOpen(true);
        };

        const handleImport = () => {
            addToast({
                title: 'Import is coming soon',
                description: 'We will add it in a future update.',
                variant: 'info',
            });
        };

        window.addEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
        window.addEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);

        return () => {
            window.removeEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
            window.removeEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);
        };
    }, [addToast]);

    const handleCreate = async (name: string) => {
        try {
            const scriptId = await createScript(name);

            setIsModalOpen(false);
            void navigate(`/script/${scriptId}/editor`);
            setStorageError(null);
            addToast({
                title: 'Script created',
                description: name.trim() || 'Untitled script',
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to create script', error);
            setStorageError('Failed to create script.');
            addToast({
                title: 'Failed to create script',
                description: 'Please try again.',
                variant: 'error',
            });
        }
    };

    return (
        <AppLayout
            header={(
                <AppHeader
                    showScriptMenu={false}
                    onHome={() => navigate('/')}
                    onNewScript={() => setIsModalOpen(true)}
                />
            )}
        >
            <div className={styles.page}>
                {storageError ? (
                    <div role="alert" style={{padding: '12px 0'}}>
                        {storageError}
                    </div>
                ) : null}
                <section className={styles.header}>
                    <div>
                        <p className={styles.kicker}>Scripts</p>
                        <h1 className={styles.title}>All scenarios</h1>
                        <p className={styles.subtitle}>
                            Keep drafts, outlines, and finished scripts in one consistent view.
                        </p>
                    </div>
                    <button
                        className={styles.primaryButton}
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                    >
                        New script
                    </button>
                </section>
                <section className={styles.grid}>
                    {scripts.map((script, index) => (
                        <article
                            key={script.id}
                            className={styles.card}
                            onClick={() => navigate(`/script/${script.id}/editor`)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={event => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    void navigate(`/script/${script.id}/editor`);
                                }
                            }}
                        >
                            <div className={styles.cardHeader}>
                                <h2 className={styles.cardTitle}>{script.name}</h2>
                                <span className={styles.cardTag}>
                                    {mockMeta[index]?.status ?? 'Draft'}
                                </span>
                            </div>
                            <p className={styles.cardMeta}>
                                {mockMeta[index]?.updated ?? 'Edited recently'}
                            </p>
                            <div className={styles.cardFooter}>
                                <button
                                    className={styles.secondaryButton}
                                    type="button"
                                    onClick={event => {
                                        event.stopPropagation();
                                        void navigate(`/script/${script.id}/editor`);
                                    }}
                                >
                                    Open editor
                                </button>
                                <button
                                    className={styles.ghostButton}
                                    type="button"
                                    onClick={event => {
                                        event.stopPropagation();
                                        void navigate(`/script/${script.id}/settings`);
                                    }}
                                >
                                    Settings
                                </button>
                            </div>
                        </article>
                    ))}
                </section>
            </div>
            <NewScriptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={name => {
                    void handleCreate(name);
                }}
            />
        </AppLayout>
    );
};
