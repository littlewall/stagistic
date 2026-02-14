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
    Tag,
} from '@stagistic/ui';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useMemo,
} from 'react';
import {Link, useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
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
    const {
        scripts,
        scriptSummaries,
        isLoading: scriptsLoading,
    } = useScripts();
    const {openNewScript} = useGlobalModals();
    const recentScripts = useMemo(() => scripts.slice(0, 6), [scripts]);
    const openModal = useCallback(() => {
        openNewScript();
    }, [openNewScript]);

    const latestScript = useMemo(() => {
        if (scriptSummaries.length === 0) {
            return null;
        }

        return scriptSummaries[0];
    }, [scriptSummaries]);

    const formatLastEdited = useCallback((timestamp: number) => {
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
    }, []);

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
        () => recentScripts.map((script, index) => (
            <Card
                key={script.id}
                className={styles.card}
                onClick={() => handleCardClick(script.id)}
                role="button"
                tabIndex={0}
                onKeyDown={event => handleCardKeyDown(script.id, event)}
            >
                <CardHeader>
                    <h3 className={styles.cardTitle}>{script.name}</h3>
                    <Tag>
                        {mockUpdates[index]?.status ?? 'Draft'}
                    </Tag>
                </CardHeader>
                <CardContent>
                    <SubtleText>
                        {mockUpdates[index]?.updated ?? 'Edited recently'}
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
        ))
        , [
            handleCardClick,
            handleCardKeyDown,
            handleOpenEditor,
            handleOpenSettings,
            recentScripts,
        ],
    );

    return (
        <AppLayout
            header={(
                <AppHeader
                    showScriptMenu={false}
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
                                {scripts && scripts.length > 6 && (
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
                        {scriptsLoading ? (
                            <ProgressPanel
                                title="Načítám poslední scénář"
                                subtitle="Zjišťuji naposledy otevřený scénář"
                                size="sm"
                                statusText="Načítám poslední scénář"
                            />
                        ) : latestScript ? (
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

                        ) : null}
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
