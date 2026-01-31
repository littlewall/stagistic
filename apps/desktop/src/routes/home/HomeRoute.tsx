import {
    AppHeader,
    AppLayout,
} from '@stagistic/ui';
import {useState} from 'react';
import {Link, useNavigate} from 'react-router-dom';

import {NewScriptModal} from '~components/NewScriptModal';
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
    const {scripts, createScript} = useScripts();

    const handleCreate = (name: string) => {
        const script = createScript(name);

        setIsModalOpen(false);
        void navigate(`/script/${script.id}/editor`);
    };

    return (
        <AppLayout
            header={(
                <AppHeader showScriptMenu={false} />
            )}
        >
            <div className={styles.page}>
                <section className={styles.hero}>
                    <div className={styles.heroContent}>
                        <p className={styles.kicker}>Welcome back</p>
                        <h1 className={styles.title}>Build your next scenario with clarity.</h1>
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
                            <Link className={styles.secondaryButton} to="/script/list">
                                View all scripts
                            </Link>
                        </div>
                    </div>
                    <div className={styles.heroCard}>
                        <h2 className={styles.heroCardTitle}>Today</h2>
                        <p className={styles.heroCardValue}>2 drafts in progress</p>
                        <p className={styles.heroCardHint}>Pick up where you left off.</p>
                    </div>
                </section>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>Recent scripts</h2>
                            <p className={styles.sectionSubtitle}>Jump straight into your latest work.</p>
                        </div>
                        <button
                            className={styles.secondaryButton}
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                        >
                            New script
                        </button>
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
            </div>
            <NewScriptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreate}
            />
        </AppLayout>
    );
};
