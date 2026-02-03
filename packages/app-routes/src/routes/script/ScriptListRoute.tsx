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
                        {mockMeta[index]?.status ?? 'Draft'}
                    </Tag>
                </CardHeader>
                <CardContent>
                    <SubtleText>
                        {mockMeta[index]?.updated ?? 'Edited recently'}
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
                    showScriptMenu={false}
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
