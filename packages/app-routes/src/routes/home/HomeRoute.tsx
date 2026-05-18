import {useScripts} from '@stagistic/app-core';
import {
    AppHeader,
    AppLayout,
    Button,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    Grid,
    HeroLayout,
    Kicker,
    PageContainer,
    PageTitle,
    ProgressPanel,
    Section,
    SectionHeader,
    SectionTitle,
    SubtleText,
} from '@stagistic/ui';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useMemo,
} from 'react';
import {Link, useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {formatLastEdited} from '../../utils/formatLastEdited';
import styles from './HomeRoute.module.css';

export const HomeRoute = () => {
    const navigate = useNavigate();
    const {
        scriptSummaries,
        isLoading: scriptsLoading,
    } = useScripts();
    const {openNewScript} = useGlobalModals();
    const recentScripts = useMemo(() => scriptSummaries.slice(0, 6), [scriptSummaries]);
    const openModal = useCallback(() => {
        openNewScript();
    }, [openNewScript]);

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
    const recentScriptCards = useMemo(
        () => recentScripts.map(script => (
            <Card
                key={script.id}
                className={styles.card}
                onClick={() => handleCardClick(script.id)}
                role="button"
                tabIndex={0}
                onKeyDown={event => handleCardKeyDown(script.id, event)}
            >
                <CardHeader>
                    <h3 className={styles.cardTitle}>{script.title}</h3>
                </CardHeader>
                <CardContent>
                    <SubtleText>
                        {formatLastEdited(script.updatedAt)}
                    </SubtleText>
                </CardContent>
                <CardFooter>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={event => handleOpenEditor(script.id, event)}
                    >
                        Open editor
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={event => handleOpenSettings(script.id, event)}
                    >
                        Script settings
                    </Button>
                </CardFooter>
            </Card>
        )),
        [
            handleCardClick,
            handleCardKeyDown,
            handleOpenEditor,
            handleOpenSettings,
            recentScripts,
        ],
    );
    const heroPanel = useMemo(() => {
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
            <Card className={styles.heroCard} variant="highlight">
                <CardContent>
                    <Kicker>Continue writing</Kicker>
                    <h2 className={styles.heroCardValue}>{latestScript.title}</h2>
                    <SubtleText>
                        {formatLastEdited(latestScript.updatedAt)}
                    </SubtleText>
                </CardContent>
                <CardFooter className={styles.heroCardFooter}>
                    <Button
                        className={styles.heroCardButton}
                        onClick={handleResumeScript}
                    >
                        Resume script
                    </Button>
                </CardFooter>
            </Card>
        );
    }, [
        handleResumeScript,
        latestScript,
        scriptsLoading,
    ]);

    return (
        <AppLayout
            header={(
                <AppHeader
                    onHome={handleHome}
                    onNewScript={openModal}
                />
            )}
        >
            <PageContainer variant="standard">
                <section className={styles.hero}>
                    <HeroLayout>
                        <div className={styles.heroContent}>
                            <Kicker>Welcome to Stagistic Editor!</Kicker>
                            <PageTitle>Your script&apos;s next act</PageTitle>
                            <SubtleText className={styles.subtitle}>
                                Create new scripts, explore active drafts, and keep your storytelling flow
                                within a focused workspace.
                            </SubtleText>
                            <div className={styles.actions}>
                                <Button onClick={openModal}>
                                    New script
                                </Button>
                                {scriptSummaries.length > 6 && (
                                    <Button
                                        as={Link}
                                        variant="secondary"
                                        to="/script/list"
                                    >
                                        View all scripts
                                    </Button>
                                )}
                            </div>
                        </div>
                        {heroPanel}
                    </HeroLayout>
                </section>
                {scriptsLoading ? (
                    <Section className={styles.recentSection}>
                        <SectionHeader>
                            <div>
                                <SectionTitle>Recent scripts</SectionTitle>
                                <SubtleText>
                                    Gathering your latest work.
                                </SubtleText>
                            </div>
                        </SectionHeader>
                        <div className={styles.recentLoading}>
                            <ProgressPanel
                                title="Načítám scénáře"
                                subtitle="Synchronizuji seznam scénářů"
                                size="sm"
                                statusText="Načítám seznam scénářů"
                            />
                        </div>
                    </Section>
                ) : recentScripts.length > 0 && (
                    <Section className={styles.recentSection}>
                        <SectionHeader>
                            <div>
                                <SectionTitle>Recent scripts</SectionTitle>
                                <SubtleText>
                                    Jump straight into your latest work.
                                </SubtleText>
                            </div>
                        </SectionHeader>
                        <Grid>
                            {recentScriptCards}
                        </Grid>
                    </Section>
                )}
            </PageContainer>
        </AppLayout>
    );
};
