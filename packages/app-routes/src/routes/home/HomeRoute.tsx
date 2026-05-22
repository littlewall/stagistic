import {useScripts} from '@stagistic/app-core';
import {
    AppHeader,
    AppLayout,
    Button,
    Card,
    CardContent,
    Kicker,
    PageContainer,
    PageTitle,
    ProgressPanel,
    SectionTitle,
    SubtleText,
} from '@stagistic/ui';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useMemo,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {formatLastEdited} from '../../utils/formatLastEdited';
import styles from './HomeRoute.module.css';

export const HomeRoute = () => {
    const navigate = useNavigate();
    const {
        scriptSummaries,
        isLoading: scriptsLoading,
    } = useScripts();
    const {openNewScript, openImportScript} = useGlobalModals();

    const latestScript = useMemo(() => scriptSummaries[0] ?? null, [scriptSummaries]);

    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
    const handleResumeScript = useCallback(() => {
        if (!latestScript) {
            return;
        }
        void navigate(`/script/${latestScript.id}/editor`);
    }, [latestScript, navigate]);
    const handleCardClick = useCallback((scriptId: string) => {
        void navigate(`/script/${scriptId}/editor`);
    }, [navigate]);
    const handleCardKeyDown = useCallback((scriptId: string, event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            void navigate(`/script/${scriptId}/editor`);
        }
    }, [navigate]);
    const handleOpenEditor = useCallback((scriptId: string, event: ReactMouseEvent<HTMLElement>) => {
        event.stopPropagation();
        void navigate(`/script/${scriptId}/editor`);
    }, [navigate]);
    const handleOpenSettings = useCallback((scriptId: string, event: ReactMouseEvent<HTMLElement>) => {
        event.stopPropagation();
        void navigate(`/script/${scriptId}/settings`);
    }, [navigate]);

    const scriptRows = useMemo(
        () => scriptSummaries.map(script => (
            <Card
                key={script.id}
                compact
                className={styles.scriptRow}
                onClick={() => handleCardClick(script.id)}
                role="button"
                tabIndex={0}
                onKeyDown={event => handleCardKeyDown(script.id, event)}
            >
                <div className={styles.inner}>
                    <div className={styles.info}>
                        <span className={styles.title}>{script.title}</span>
                        <SubtleText className={styles.meta}>
                            {formatLastEdited(script.updatedAt)}
                        </SubtleText>
                    </div>
                    <div className={styles.actions}>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={event => handleOpenEditor(script.id, event)}
                        >
                            Open
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={event => handleOpenSettings(script.id, event)}
                        >
                            Settings
                        </Button>
                    </div>
                </div>
            </Card>
        )),
        [
            handleCardClick,
            handleCardKeyDown,
            handleOpenEditor,
            handleOpenSettings,
            scriptSummaries,
        ],
    );

    const continueCard = useMemo(() => {
        if (scriptsLoading) {
            return (
                <ProgressPanel
                    title="Načítám poslední scénář"
                    subtitle="Zjišťuji naposledy otevřený scénář"
                    size="sm"
                    statusText="Načítám poslední scénář"
                />
            );
        }

        if (!latestScript) {
            return null;
        }

        return (
            <Card
                compact
                className={styles.continueCard}
                onClick={handleResumeScript}
                role="button"
                tabIndex={0}
                onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleResumeScript();
                    }
                }}
            >
                <CardContent>
                    <h3 className={styles.title}>{latestScript.title}</h3>
                    <SubtleText>
                        {formatLastEdited(latestScript.updatedAt)}
                    </SubtleText>
                </CardContent>
            </Card>
        );
    }, [handleResumeScript, latestScript, scriptsLoading]);

    return (
        <AppLayout
            header={(
                <AppHeader
                    onHome={handleHome}
                    onNewScript={openNewScript}
                    onImportScript={openImportScript}
                />
            )}
        >
            <PageContainer variant="standard">
                <div className={styles.columns}>
                    <div className={styles.scriptList}>
                        <div className={styles.header}>
                            <SectionTitle>Scripts</SectionTitle>
                        </div>
                        {scriptsLoading ? (
                            <ProgressPanel
                                title="Načítám scénáře"
                                subtitle="Synchronizuji seznam scénářů"
                                size="sm"
                                statusText="Načítám seznam scénářů"
                            />
                        ) : (
                            <div className={styles.items}>
                                {scriptRows}
                            </div>
                        )}
                    </div>

                    <div className={styles.rightPanel}>
                        <section className={styles.welcome}>
                            <Kicker>Welcome to Stagistic Editor!</Kicker>
                            <PageTitle>Your script&apos;s next act</PageTitle>
                            <SubtleText className={styles.subtitle}>
                                Create new scripts, explore active drafts, and keep your storytelling flow
                                within a focused workspace.
                            </SubtleText>
                            <div className={styles.actions}>
                                <Button onClick={openNewScript}>
                                    New script
                                </Button>
                                <Button variant="outline" onClick={openImportScript}>
                                    Import
                                </Button>
                            </div>
                        </section>

                        {continueCard !== null && (
                            <section className={styles.continueSection}>
                                <SectionTitle className={styles.title}>
                                    Continue writing
                                </SectionTitle>
                                {continueCard}
                            </section>
                        )}
                    </div>
                </div>
            </PageContainer>
        </AppLayout>
    );
};
