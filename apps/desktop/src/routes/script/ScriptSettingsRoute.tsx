import {
    AppHeader,
    AppLayout,
} from '@stagistic/ui';
import {
    type SubmitEvent,
    useCallback,
    useEffect,
    useState,
} from 'react';
import {useNavigate, useParams} from 'react-router-dom';

import {useScripts} from '~hooks/useScripts';

import styles from './ScriptSettingsRoute.module.css';

const FALLBACK_NAME = 'Untitled script';

export const ScriptSettingsRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const {scripts, updateScripts} = useScripts();
    const [scriptName, setScriptName] = useState('');

    const currentScript = scripts.find(script => script.id === scriptId) ?? scripts[0];

    useEffect(() => {
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
        navigate,
    ]);

    useEffect(() => {
        if (currentScript) {
            setScriptName(currentScript.name);
        }
    }, [currentScript]);

    const handleSaveName = useCallback((event?: SubmitEvent<HTMLFormElement>) => {
        event?.preventDefault();

        if (!currentScript) {
            return;
        }

        const nextName = scriptName.trim() || FALLBACK_NAME;

        if (nextName === currentScript.name) {
            setScriptName(nextName);

            return;
        }

        const nextScripts = scripts.map(script => {
            return script.id === currentScript.id
                ? {...script, name: nextName}
                : script;
        });

        updateScripts(nextScripts);
        setScriptName(nextName);
    }, [
        currentScript,
        scriptName,
        scripts,
        updateScripts,
    ]);

    const handleDelete = useCallback(() => {
        if (!currentScript) {
            return;
        }

        const nextScripts = scripts.filter(script => script.id !== currentScript.id);

        updateScripts(nextScripts);
        void navigate('/');
    }, [
        currentScript,
        navigate,
        scripts,
        updateScripts,
    ]);

    if (!currentScript) {
        return null;
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    showScriptMenu={false}
                    onHome={() => navigate('/')}
                    onBackToEditor={() => navigate(`/script/${currentScript.id}/editor`)}
                />
            )}
        >
            <div className={styles.page}>
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
        </AppLayout>
    );
};
