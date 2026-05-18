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
    Kicker,
    PageContainer,
    PageTitle,
    ProgressPanel,
    SubtleText,
    Tag,
} from '@stagistic/ui';
import {
    type KeyboardEvent as ReactKeyboardEvent,
    type MouseEvent as ReactMouseEvent,
    useCallback,
    useMemo,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {MOCK_SCRIPT_META} from '../mockScriptMeta';
import styles from './ScriptListRoute.module.css';

export const ScriptListRoute = () => {
    const navigate = useNavigate();
    const {scripts, isLoading: scriptsLoading} = useScripts();
    const {openNewScript} = useGlobalModals();
    const openModal = useCallback(() => {
        openNewScript();
    }, [openNewScript]);
    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
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
    const scriptCards = useMemo(
        () => scripts.map((script, index) => (
            <Card
                key={script.id}
                className={styles.card}
                onClick={() => handleCardClick(script.id)}
                role="button"
                tabIndex={0}
                onKeyDown={event => handleCardKeyDown(script.id, event)}
            >
                <CardHeader>
                    <h2 className={styles.cardTitle}>{script.name}</h2>
                    <Tag>
                        {MOCK_SCRIPT_META[index]?.status ?? 'Draft'}
                    </Tag>
                </CardHeader>
                <CardContent>
                    <SubtleText>
                        {MOCK_SCRIPT_META[index]?.updated ?? 'Edited recently'}
                    </SubtleText>
                </CardContent>
                <CardFooter>
                    <Button
                        variant="secondary"
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
                        Settings
                    </Button>
                </CardFooter>
            </Card>
        ))
        , [
            handleCardClick,
            handleCardKeyDown,
            handleOpenEditor,
            handleOpenSettings,
            scripts,
        ],
    );

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
                <section className={styles.header}>
                    <div>
                        <Kicker>Scripts</Kicker>
                        <PageTitle className={styles.title}>All scenarios</PageTitle>
                        <SubtleText className={styles.subtitle}>
                            Keep drafts, outlines, and finished scripts in one consistent view.
                        </SubtleText>
                    </div>
                    <Button onClick={openModal}>
                        New script
                    </Button>
                </section>
                {scriptsLoading ? (
                    <div className={styles.listLoading}>
                        <ProgressPanel
                            title="Načítám scénáře"
                            subtitle="Synchronizuji seznam scénářů"
                            size="sm"
                            statusText="Načítám seznam scénářů"
                        />
                    </div>
                ) : (
                    <Grid>
                        {scriptCards}
                    </Grid>
                )}
            </PageContainer>
        </AppLayout>
    );
};
