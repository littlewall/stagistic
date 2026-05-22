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
    PageHeader,
    PageTitle,
    ProgressPanel,
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
import styles from './ScriptListRoute.module.css';

export const ScriptListRoute = () => {
    const navigate = useNavigate();
    const {scriptSummaries, isLoading: scriptsLoading} = useScripts();
    const {openNewScript, openImportScript} = useGlobalModals();
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
        () => scriptSummaries.map(script => (
            <Card
                key={script.id}
                className={styles.card}
                onClick={() => handleCardClick(script.id)}
                role="button"
                tabIndex={0}
                onKeyDown={event => handleCardKeyDown(script.id, event)}
            >
                <CardHeader>
                    <h2 className={styles.cardTitle}>{script.title}</h2>
                </CardHeader>
                <CardContent>
                    <SubtleText>
                        {formatLastEdited(script.updatedAt)}
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
        )),
        [
            handleCardClick,
            handleCardKeyDown,
            handleOpenEditor,
            handleOpenSettings,
            scriptSummaries,
        ],
    );

    return (
        <AppLayout
            header={(
                <AppHeader
                    onHome={handleHome}
                    onNewScript={openModal}
                    onImportScript={openImportScript}
                />
            )}
        >
            <PageContainer variant="standard">
                <PageHeader>
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
                </PageHeader>
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
