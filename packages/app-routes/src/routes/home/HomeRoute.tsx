import {useScripts} from '@stagistic/app-core';
import {
    AppLayout,
    Button,
    Card,
    PageContainer,
    PageTitle,
    SectionTitle,
    SubtleText,
} from '@stagistic/ui';
import {type KeyboardEvent as ReactKeyboardEvent, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {AppHeader} from '../../layout/AppHeader';
import {formatLastEdited} from '../../utils/formatLastEdited';
import styles from './HomeRoute.module.css';

export const HomeRoute = () => {
    const navigate = useNavigate();
    const {
        scriptSummaries, isLoading: scriptsLoading, error, refreshScripts,
    } = useScripts();
    const {openNewScript, openImportScript} = useGlobalModals();

    const latestScript = useMemo(() => scriptSummaries[0] ?? null, [scriptSummaries]);

    if (scriptsLoading) {
        return (
            <AppLayout header={<AppHeader />}>
                <PageContainer variant="standard">
                    <div className={styles.skeleton}>
                        <div className={styles.skeletonHero} />
                        <div className={styles.skeletonList}>
                            <div className={styles.skeletonRow} />
                            <div className={styles.skeletonRow} />
                            <div className={styles.skeletonRow} />
                        </div>
                    </div>
                </PageContainer>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout header={<AppHeader />}>
                <PageContainer variant="standard">
                    <div className={styles.errorState}>
                        <SubtleText>Couldn&apos;t load your scripts.</SubtleText>
                        <Button variant="outline" onPress={() => void refreshScripts()}>
                            Try again
                        </Button>
                    </div>
                </PageContainer>
            </AppLayout>
        );
    }

    if (scriptSummaries.length === 0) {
        return (
            <AppLayout header={<AppHeader />}>
                <PageContainer variant="standard">
                    <div className={styles.emptyState}>
                        <PageTitle>Your script&apos;s next act.</PageTitle>
                        <SubtleText className={styles.emptySubtitle}>
                            A script editor for theatrical plays and musicals.
                            Create your first script to get started.
                        </SubtleText>
                        <div className={styles.emptyActions}>
                            <Button onPress={openNewScript}>New script</Button>
                            <Button variant="outline" onPress={openImportScript}>Import script</Button>
                        </div>
                    </div>
                </PageContainer>
            </AppLayout>
        );
    }

    return (
        <AppLayout header={<AppHeader />}>
            <PageContainer variant="standard">
                <div className={styles.content}>
                    {latestScript !== null && (
                        <section className={styles.continueSection}>
                            <Card
                                variant="highlight"
                                className={styles.continueCard}
                                onClick={() => void navigate(`/script/${latestScript.id}/editor`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        void navigate(`/script/${latestScript.id}/editor`);
                                    }
                                }}
                            >
                                <div className={styles.continueBody}>
                                    <span className={styles.continueLabel}>Continue writing</span>
                                    <h2 className={styles.continueTitle}>{latestScript.title}</h2>
                                </div>
                                <SubtleText className={styles.continueMeta}>
                                    {formatLastEdited(latestScript.updatedAt)}
                                </SubtleText>
                            </Card>
                        </section>
                    )}
                    <section className={styles.scriptListSection}>
                        <SectionTitle>Scripts</SectionTitle>
                        <div className={styles.items}>
                            {scriptSummaries.map(script => (
                                <div
                                    key={script.id}
                                    className={styles.scriptRow}
                                    onClick={() => void navigate(`/script/${script.id}/editor`)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(event: ReactKeyboardEvent<HTMLElement>) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            void navigate(`/script/${script.id}/editor`);
                                        }
                                    }}
                                >
                                    <div className={styles.scriptInfo}>
                                        <span className={styles.scriptTitle}>{script.title}</span>
                                        <SubtleText className={styles.scriptMeta}>
                                            {formatLastEdited(script.updatedAt)}
                                        </SubtleText>
                                    </div>
                                    <div
                                        className={styles.scriptActions}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onPress={() => void navigate(`/script/${script.id}/settings`)}
                                        >
                                            Settings
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </PageContainer>
        </AppLayout>
    );
};
