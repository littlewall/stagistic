import {
    AppHeader,
    AppLayout,
} from '@stagistic/ui';
import {
    type FormEvent,
    useCallback,
    useEffect,
    useState,
} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {NewScriptModal} from '~components/NewScriptModal';
import {useToastController} from '~components/ToastProvider';
import {
    MENU_EVENT_IMPORT_SCRIPT,
    MENU_EVENT_NEW_SCRIPT,
} from '~constants/menuEvents';
import {useScripts} from '~hooks/useScripts';

import styles from './ScriptSettingsRoute.module.css';

const FALLBACK_NAME = 'Untitled script';

export const ScriptSettingsRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const {
        scripts,
        createScript,
        renameScript,
        deleteScript,
        isLoading: scriptsLoading,
    } = useScripts();
    const [scriptName, setScriptName] = useState('');
    const [storageError, setStorageError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const {addToast} = useToastController();

    const currentScript = scripts.find(script => script.id === scriptId) ?? scripts[0];

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

    const handleCreate = useCallback(async (name: string) => {
        try {
            const newScriptId = await createScript(name);

            setIsModalOpen(false);
            void navigate(`/script/${newScriptId}/editor`);
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
    }, [
        addToast,
        createScript,
        navigate,
    ]);

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

    if (scriptsLoading || !currentScript) {
        return null;
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    showScriptMenu={false}
                    onHome={() => navigate('/')}
                    onNewScript={() => setIsModalOpen(true)}
                    onBackToEditor={() => navigate(`/script/${currentScript.id}/editor`)}
                />
            )}
        >
            <div className={styles.page}>
                {storageError ? (
                    <div role="alert" style={{padding: '12px 0'}}>
                        {storageError}
                    </div>
                ) : null}
                <section className={styles.header}>
                    <div>
                        <p className={styles.kicker}>Script settings</p>
                        <h1 className={styles.title}>{currentScript.name}</h1>
                        <p className={styles.subtitle}>
                            Adjust the script name and manage your scenario workspace.
                        </p>
                    </div>
                </section>
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <h2 className={styles.sectionTitle}>General</h2>
                            <p className={styles.sectionHint}>Rename your script anytime.</p>
                        </div>
                    </div>
                    <form className={styles.form} onSubmit={handleSaveName}>
                        <label className={styles.label} htmlFor="script-name">
                            Script name
                            <input
                                id="script-name"
                                className={styles.input}
                                value={scriptName}
                                onChange={event => setScriptName(event.target.value)}
                                placeholder="Script name"
                                type="text"
                            />
                        </label>
                        <div className={styles.actions}>
                            <button
                                className={styles.primaryButton}
                                type="submit"
                                disabled={scriptName.trim() === ''}
                            >
                                Save name
                            </button>
                            <button
                                className={styles.secondaryButton}
                                type="button"
                                onClick={() => setScriptName(currentScript.name)}
                            >
                                Reset
                            </button>
                        </div>
                    </form>
                </section>
                <section className={styles.dangerSection}>
                    <div>
                        <h2 className={styles.sectionTitle}>Danger zone</h2>
                        <p className={styles.sectionHint}>
                            Deleting a script removes it from your workspace.
                        </p>
                    </div>
                    <button
                        className={styles.dangerButton}
                        type="button"
                        onClick={handleDelete}
                    >
                        Delete script
                    </button>
                </section>
            </div>
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
