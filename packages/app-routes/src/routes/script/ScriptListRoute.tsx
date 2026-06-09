import {useScripts} from '@stagistic/app-core';
import {
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
import {type KeyboardEvent as ReactKeyboardEvent, useMemo} from 'react';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {AppHeader} from '../../layout/AppHeader';
import {formatLastEdited} from '../../utils/formatLastEdited';
import styles from './ScriptListRoute.module.css';

export const ScriptListRoute = () => {
    const navigate = useNavigate();
    const {scriptSummaries, isLoading: scriptsLoading} = useScripts();
    const {openNewScript} = useGlobalModals();

    const scriptCards = useMemo(
        () => scriptSummaries.map(script => (
            <Card
                key={script.id}
                className={styles.card}
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
                        onPress={() => void navigate(`/script/${script.id}/editor`)}
                    >
                        Open editor
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => void navigate(`/script/${script.id}/settings`)}
                    >
                        Settings
                    </Button>
                </CardFooter>
            </Card>
        )),
        [navigate, scriptSummaries],
    );

    return (
        <AppLayout header={<AppHeader />}>
            <PageContainer variant="standard">
                <PageHeader>
                    <div>
                        <Kicker>Scripts</Kicker>
                        <PageTitle className={styles.title}>All scenarios</PageTitle>
                        <SubtleText className={styles.subtitle}>
                            Keep drafts, outlines, and finished scripts in one consistent view.
                        </SubtleText>
                    </div>
                    <Button onPress={openNewScript}>
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
