import {
    AppHeader,
    AppLayout,
} from '@stagistic/ui';
import {useState} from 'react';
import {useNavigate} from 'react-router-dom';

import {NewScriptModal} from '~components/NewScriptModal';
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
    const {scripts, createScript} = useScripts();

    const handleCreate = (name: string) => {
        const script = createScript(name);

        setIsModalOpen(false);
        void navigate(`/script/${script.id}/editor`);
    };

    return (
        <AppLayout
            header={(
                <AppHeader
                    showScriptMenu={false}
                    onHome={() => navigate('/')}
                />
            )}
        >
            <div className={styles.page}>
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
                onCreate={handleCreate}
            />
        </AppLayout>
    );
};
