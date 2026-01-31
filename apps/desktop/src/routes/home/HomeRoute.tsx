import {
    AppHeader,
    AppLayout,
} from '@stagistic/ui';
import {
    useEffect, useMemo, useState,
} from 'react';
import {Link, useNavigate} from 'react-router-dom';

import {NewScriptModal} from '~components/NewScriptModal';
import {useToastController} from '~components/ToastProvider';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '~constants/menuEvents';
import {useScripts} from '~hooks/useScripts';

import styles from './HomeRoute.module.css';

const mockUpdates = [
    {
        id: '1', updated: 'Edited today', status: 'Draft',
    },
    {
        id: '2', updated: 'Edited yesterday', status: 'In progress',
    },
    {
        id: '3', updated: 'Edited 3 days ago', status: 'Concept',
    },
    {
        id: '4', updated: 'Edited last week', status: 'Outline',
    },
];

export const HomeRoute = () => {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [storageError, setStorageError] = useState<string | null>(null);
    const {
        scripts,
        scriptSummaries,
        createScript,
    } = useScripts();
    const {addToast} = useToastController();

    const latestScript = useMemo(() => {
        if (scriptSummaries.length === 0) {
            return null;
        }

        return scriptSummaries[0];
    }, [scriptSummaries]);

    const formatLastEdited = (timestamp: number) => {
        const now = new Date();
        const updated = new Date(timestamp);
        const diffMs = now.getTime() - updated.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            return 'Edited today';
        }

        if (diffDays === 1) {
            return 'Edited yesterday';
        }

        if (diffDays < 7) {
            return `Edited ${diffDays} days ago`;
        }

        const dateFormat = new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            year: updated.getFullYear() === now.getFullYear() ? undefined : 'numeric',
        });

        return `Edited ${dateFormat.format(updated)}`;
    };

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
                <section className={styles.hero}>
                    <div className={styles.heroContent}>
                        <p className={styles.kicker}>Welcome to Stagistic Editor!</p>
                        <h1 className={styles.title}>Your script&apos;s next act</h1>
                        <p className={styles.subtitle}>
                            Create new scripts, explore active drafts, and keep your storytelling flow
                            within a focused workspace.
                        </p>
                        <div className={styles.actions}>
                            <button
                                className={styles.primaryButton}
                                type="button"
                                onClick={() => setIsModalOpen(true)}
                            >
                                New script
                            </button>
                            {scripts && scripts.length > 0 && (
                                <Link className={styles.secondaryButton} to="/script/list">
                                    View all scripts
                                </Link>
                            )}
                        </div>
                    </div>
                    {latestScript && (
                        <div className={styles.heroCard}>
                            <p className={styles.heroCardTitle}>Continue writing</p>
                            <h2 className={styles.heroCardValue}>{latestScript.title}</h2>
                            <p className={styles.heroCardHint}>
                                {formatLastEdited(latestScript.updatedAt)}
                            </p>
                            <button
                                className={styles.heroCardButton}
                                type="button"
                                onClick={() => navigate(`/script/${latestScript.id}/editor`)}
                            >
                                Resume script
                            </button>
                        </div>

                    )}
                </section>
                {scripts && scripts.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <div>
                                <h2 className={styles.sectionTitle}>Recent scripts</h2>
                                <p className={styles.sectionSubtitle}>Jump straight into your latest work.</p>
                            </div>
                        </div>
                        <div className={styles.cardGrid}>
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
                                        <h3 className={styles.cardTitle}>{script.name}</h3>
                                        <span className={styles.cardTag}>{mockUpdates[index]?.status ?? 'Draft'}</span>
                                    </div>
                                    <p className={styles.cardMeta}>
                                        {mockUpdates[index]?.updated ?? 'Edited recently'}
                                    </p>
                                    <div className={styles.cardFooter}>
                                        <button
                                            className={styles.ghostButton}
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
                                            Script settings
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                )}
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
