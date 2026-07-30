import {useScriptRepository, useScripts} from '@stagistic/app-core';
import {
    AppLayout,
    Button,
    Input,
    LoaderOverlay,
    PageContainer,
    PageTitle,
    PlusIcon,
    ScriptIcon,
    SearchIcon,
    Select,
    SubtleText,
    UploadIcon,
} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {AppHeader} from '../../layout/AppHeader';
import {useDocumentTitle} from '../../useDocumentTitle';
import {
    buildHomeDashboardModel,
    type ScriptSort,
} from './homeDashboardModel';
import styles from './HomeRoute.module.css';
import {ScriptListSection} from './ScriptListSection';

const SORT_OPTIONS = [{value: 'newest', label: 'Newest first'}, {value: 'title', label: 'Title A–Z'}];

export const HomeRoute = () => {
    useDocumentTitle('Scripts');

    const navigate = useNavigate();
    const repository = useScriptRepository();
    const {
        scriptSummaries,
        isLoading: scriptsLoading,
        error,
        refreshScripts,
        createScript,
        deleteScript: deleteScriptRecord,
    } = useScripts();
    const {
        openNewScript,
        openImportScript,
        openDeleteScript,
        openRenameScript,
        openDuplicateScript,
    } = useGlobalModals();
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<ScriptSort>('newest');
    const [isCreatingExample, setIsCreatingExample] = useState(false);
    const [exampleError, setExampleError] = useState<string | null>(null);

    const dashboard = useMemo(() => buildHomeDashboardModel({
        scripts: scriptSummaries,
        query,
        sort,
    }), [
        query,
        scriptSummaries,
        sort,
    ]);
    const openScript = useCallback((scriptId: string) => {
        void navigate(`/script/${scriptId}/editor`);
    }, [navigate]);
    const deleteScript = useCallback((script: {id: string, title: string}) => {
        openDeleteScript({id: script.id, title: script.title});
    }, [openDeleteScript]);
    const renameScript = useCallback((script: {
        id: string, title: string, subtitle: string | null,
    }) => {
        openRenameScript({
            id: script.id, title: script.title, subtitle: script.subtitle ?? '',
        });
    }, [openRenameScript]);
    const duplicateScript = useCallback((script: {id: string, title: string}) => {
        openDuplicateScript({id: script.id, title: script.title});
    }, [openDuplicateScript]);
    const createExample = useCallback(async () => {
        setIsCreatingExample(true);
        setExampleError(null);

        try {
            const {createExampleScript} = await import('./example-script/createExampleScript');
            const example = await createExampleScript({
                actions: {
                    createScript,
                    deleteScript: deleteScriptRecord,
                },
                repository,
            });

            void navigate(`/script/${example.scriptId}/editor`);
        } catch (caughtError) {
            console.error('Could not create example script.', caughtError);
            setExampleError('Couldn’t create the example script. Please try again.');
        } finally {
            setIsCreatingExample(false);
        }
    }, [
        createScript,
        deleteScriptRecord,
        navigate,
        repository,
    ]);

    if (isCreatingExample) {
        return (
            <LoaderOverlay
                label="Preparing example script"
                messages={['Creating script and loading attachments']}
            />
        );
    }

    return (
        <AppLayout header={<AppHeader contentInset="page" showScriptActions={false} />}>
            <PageContainer variant="standard">
                <div className={styles.content}>
                    <PageTitle>Scripts</PageTitle>
                    <div
                        className={styles.startActions}
                        role="group"
                        aria-label="Start a script"
                    >
                        <button
                            type="button"
                            className={styles.startAction}
                            onClick={openNewScript}
                        >
                            <PlusIcon className={styles.startActionIcon} aria-hidden="true" />
                            <span className={styles.startActionCopy}>
                                <span className={styles.startActionTitle}>New script</span>
                                <span className={styles.startActionDescription}>
                                    Start with an empty theatre or musical script.
                                </span>
                            </span>
                        </button>
                        <button
                            type="button"
                            className={styles.startAction}
                            onClick={openImportScript}
                        >
                            <UploadIcon className={styles.startActionIcon} aria-hidden="true" />
                            <span className={styles.startActionCopy}>
                                <span className={styles.startActionTitle}>Import script</span>
                                <span className={styles.startActionDescription}>
                                    Bring in an existing script file.
                                </span>
                            </span>
                        </button>
                        <button
                            type="button"
                            className={styles.startAction}
                            disabled={isCreatingExample}
                            onClick={() => void createExample()}
                        >
                            <ScriptIcon className={styles.startActionIcon} aria-hidden="true" />
                            <span className={styles.startActionCopy}>
                                <span className={styles.startActionTitle}>Create example script</span>
                                <span className={styles.startActionDescription}>
                                    Explore the editor with a pre-filled script.
                                </span>
                                {exampleError ? (
                                    <span className={styles.startActionError} role="alert">
                                        {exampleError}
                                    </span>
                                ) : null}
                            </span>
                        </button>
                    </div>
                    {scriptsLoading ? (
                        <div className={styles.skeleton} aria-label="Loading scripts">
                            <div className={styles.skeletonSearch} />
                            <div className={styles.skeletonList}>
                                <div className={styles.skeletonRow} />
                                <div className={styles.skeletonRow} />
                                <div className={styles.skeletonRow} />
                            </div>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <SubtleText>Couldn&apos;t load your scripts.</SubtleText>
                            <Button variant="outline" onPress={() => void refreshScripts()}>
                                Try again
                            </Button>
                        </div>
                    ) : scriptSummaries.length === 0 ? (
                        <SubtleText className={styles.emptyLibrary}>No scripts yet.</SubtleText>
                    ) : (
                        <div className={styles.library}>
                            <div className={styles.libraryTools}>
                                <div className={styles.searchField}>
                                    <SearchIcon className={styles.searchIcon} aria-hidden="true" />
                                    <Input
                                        type="search"
                                        value={query}
                                        className={styles.searchInput}
                                        aria-label="Search scripts"
                                        placeholder="Search by title or subtitle"
                                        onChange={event => setQuery(event.target.value)}
                                    />
                                </div>
                                <Select
                                    value={sort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort scripts"
                                    className={styles.sortSelect}
                                    onChange={value => setSort(value as ScriptSort)}
                                />
                            </div>
                            <ScriptListSection
                                scripts={dashboard.scripts}
                                onOpenScript={openScript}
                                onDeleteScript={deleteScript}
                                onRenameScript={renameScript}
                                onDuplicateScript={duplicateScript}
                            />
                            {dashboard.scripts.length === 0 ? (
                                <SubtleText className={styles.noResults}>
                                    No scripts match “{query.trim()}”.
                                </SubtleText>
                            ) : null}
                        </div>
                    )}
                </div>
            </PageContainer>
        </AppLayout>
    );
};
