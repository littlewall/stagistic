import {useScripts} from '@stagistic/app-core';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '@stagistic/app-core';
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
    NewScriptModal,
    PageContainer,
    PageTitle,
    SubtleText,
    Tag,
    useToastController,
} from '@stagistic/ui';
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

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
    const [storageError, setStorageError] = useState<string | null>(null);
    const {scripts, createScript} = useScripts();
    const {addToast} = useToastController();

    useEffect(() => {
        const handleNewScript = () => {
            setIsModalOpen(true);
        };

        const handleImport = () => {
            addToast({
                title: 'Import is coming soon',
                description: 'We will add it in a future update.',
                variant: 'info',
            });
        };

        window.addEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
        window.addEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);

        return () => {
            window.removeEventListener(MENU_EVENT_NEW_SCRIPT, handleNewScript);
            window.removeEventListener(MENU_EVENT_IMPORT_SCRIPT, handleImport);
        };
    }, [addToast]);

    const handleCreate = async (name: string) => {
        try {
            const scriptId = await createScript(name);

            setIsModalOpen(false);
            void navigate(`/script/${scriptId}/editor`);
            setStorageError(null);
            addToast({
                title: 'Script created',
                description: name.trim() || 'Untitled script',
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to create script', error);
            setStorageError('Failed to create script.');
            addToast({
                title: 'Failed to create script',
                description: 'Please try again.',
                variant: 'error',
            });
        }
    };

    return (
        <AppLayout
            header={(
                <AppHeader
                    showScriptMenu={false}
                    onHome={() => navigate('/')}
                    onNewScript={() => setIsModalOpen(true)}
                />
            )}
        >
            <PageContainer variant="standard">
                {storageError ? (
                    <div role="alert" style={{padding: '12px 0'}}>
                        {storageError}
                    </div>
                ) : null}
                <section className={styles.header}>
                    <div>
                        <Kicker>Scripts</Kicker>
                        <PageTitle className={styles.title}>All scenarios</PageTitle>
                        <SubtleText className={styles.subtitle}>
                            Keep drafts, outlines, and finished scripts in one consistent view.
                        </SubtleText>
                    </div>
                    <Button onClick={() => setIsModalOpen(true)}>
                        New script
                    </Button>
                </section>
                <Grid>
                    {scripts.map((script, index) => (
                        <Card
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
                                    onClick={event => {
                                        event.stopPropagation();
                                        void navigate(`/script/${script.id}/editor`);
                                    }}
                                >
                                    Open editor
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={event => {
                                        event.stopPropagation();
                                        void navigate(`/script/${script.id}/settings`);
                                    }}
                                >
                                    Settings
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </Grid>
            </PageContainer>
            <NewScriptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={name => {
                    void handleCreate(name);
                }}
            />
        </AppLayout>
    );
};
