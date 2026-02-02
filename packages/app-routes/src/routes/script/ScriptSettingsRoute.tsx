import {useScripts} from '@stagistic/app-core';
import {
    AppHeader,
    AppLayout,
    Button,
    ButtonGroup,
    Kicker,
    PageContainer,
    PageTitle,
    Section,
    SectionHeader,
    SectionTitle,
    SubtleText,
    TextInput,
    useToastController,
} from '@stagistic/ui';
import {
    type ChangeEvent,
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import styles from './ScriptSettingsRoute.module.css';

const FALLBACK_NAME = 'Untitled script';

export const ScriptSettingsRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const {
        scripts,
        renameScript,
        deleteScript,
        isLoading: scriptsLoading,
    } = useScripts();
    const [scriptName, setScriptName] = useState('');
    const [storageError, setStorageError] = useState<string | null>(null);
    const {addToast} = useToastController();
    const {openNewScript} = useGlobalModals();

    const currentScript = useMemo(
        () => scripts.find(script => script.id === scriptId) ?? scripts[0],
        [scriptId, scripts],
    );

    useEffect(() => {
        if (scriptsLoading) {
            return;
        }

        if (!scriptId || scripts.length === 0) {
            return;
        }

        const exists = scripts.some(script => script.id === scriptId);

        if (!exists && scripts[0]) {
            void navigate(`/script/${scripts[0].id}/settings`, {replace: true});
        }
    }, [
        scriptId,
        scripts,
        scriptsLoading,
        navigate,
    ]);

    useEffect(() => {
        if (currentScript) {
            setScriptName(currentScript.name);
        }
    }, [currentScript]);

    const openModal = useCallback(() => {
        openNewScript();
    }, [openNewScript]);
    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
    const handleBackToEditor = useCallback(() => {
        if (!currentScript) {
            return;
        }

        void navigate(`/script/${currentScript.id}/editor`);
    }, [currentScript, navigate]);

    const handleSaveName = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();

        if (!currentScript) {
            return;
        }

        const nextName = scriptName.trim() || FALLBACK_NAME;

        if (nextName === currentScript.name) {
            setScriptName(nextName);

            return;
        }

        try {
            await renameScript(currentScript.id, nextName);
            setScriptName(nextName);
            setStorageError(null);
            addToast({
                title: 'Script updated',
                description: nextName,
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to rename script', error);
            setStorageError('Failed to rename script.');
            addToast({
                title: 'Failed to update script',
                description: 'Please try again.',
                variant: 'error',
            });
        }
    }, [
        addToast,
        currentScript,
        scriptName,
        renameScript,
    ]);

    const handleDelete = useCallback(async () => {
        if (!currentScript) {
            return;
        }

        try {
            await deleteScript(currentScript.id);
            void navigate('/');
            addToast({
                title: 'Script deleted',
                description: currentScript.name,
                variant: 'success',
            });
        } catch (error) {
            console.error('Failed to delete script', error);
            setStorageError('Failed to delete script.');
            addToast({
                title: 'Failed to delete script',
                description: 'Please try again.',
                variant: 'error',
            });
        }
    }, [
        addToast,
        currentScript,
        navigate,
        deleteScript,
    ]);
    const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
        setScriptName(event.target.value);
    }, []);
    const handleResetName = useCallback(() => {
        if (!currentScript) {
            return;
        }

        setScriptName(currentScript.name);
    }, [currentScript]);
    const isSaveDisabled = useMemo(() => scriptName.trim() === '', [scriptName]);

    if (scriptsLoading || !currentScript) {
        return null;
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    showScriptMenu={false}
                    onHome={handleHome}
                    onNewScript={openModal}
                    onBackToEditor={handleBackToEditor}
                />
            )}
        >
            <PageContainer variant="compact">
                {storageError ? (
                    <div role="alert" style={{padding: '12px 0'}}>
                        {storageError}
                    </div>
                ) : null}
                <section className={styles.header}>
                    <div>
                        <Kicker>Script settings</Kicker>
                        <PageTitle className={styles.title}>{currentScript.name}</PageTitle>
                        <SubtleText className={styles.subtitle}>
                            Adjust the script name and manage your scenario workspace.
                        </SubtleText>
                    </div>
                </section>
                <Section>
                    <SectionHeader>
                        <div>
                            <SectionTitle className={styles.sectionTitle}>General</SectionTitle>
                            <SubtleText className={styles.sectionHint}>Rename your script anytime.</SubtleText>
                        </div>
                    </SectionHeader>
                    <form className={styles.form} onSubmit={handleSaveName}>
                        <TextInput
                            label="Script name"
                            value={scriptName}
                            onChange={handleNameChange}
                            placeholder="Script name"
                        />
                        <ButtonGroup>
                            <Button
                                type="submit"
                                disabled={isSaveDisabled}
                            >
                                Save name
                            </Button>
                            <Button
                                variant="secondary"
                                type="button"
                                onClick={handleResetName}
                            >
                                Reset
                            </Button>
                        </ButtonGroup>
                    </form>
                </Section>
                <Section variant="danger">
                    <div>
                        <SectionTitle className={styles.sectionTitle}>Danger zone</SectionTitle>
                        <SubtleText className={styles.sectionHint}>
                            Deleting a script removes it from your workspace.
                        </SubtleText>
                    </div>
                    <Button
                        variant="danger"
                        type="button"
                        onClick={handleDelete}
                    >
                        Delete script
                    </Button>
                </Section>
            </PageContainer>
        </AppLayout>
    );
};
