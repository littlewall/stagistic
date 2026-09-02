import {useScriptRepository, useScripts} from '@stagistic/app-core';
import {
    ActionCard,
    AppLayout,
    Button,
    clsx,
    LoaderOverlay,
    Notice,
    PageContainer,
    PlusIcon,
    ScriptIcon,
    SearchInput,
    Select,
    Skeleton,
    Text,
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
    const hasScripts = scriptSummaries.length > 0;
    const showLibraryTools = scriptSummaries.length >= 5;

    const dashboard = useMemo(() => buildHomeDashboardModel({
        scripts: scriptSummaries,
        query: showLibraryTools ? query : '',
        sort: showLibraryTools ? sort : 'newest',
    }), [
        query,
        scriptSummaries,
        showLibraryTools,
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
                    <Text as="h1" size="4xl">Scripts</Text>
                    <div
                        className={clsx(
                            styles.startActions,
                            hasScripts && styles.startActionsPopulated,
                        )}
                        role="group"
                        aria-label="Start a script"
                    >
                        <ActionCard
                            type="button"
                            variant={hasScripts ? 'primary' : 'default'}
                            icon={<PlusIcon aria-hidden="true" />}
                            title="New script"
                            description="Start with an empty theatre or musical script."
                            onClick={openNewScript}
                        />
                        <ActionCard
                            type="button"
                            icon={<UploadIcon aria-hidden="true" />}
                            title="Import script"
                            description="Bring in an existing script file."
                            onClick={openImportScript}
                        />
                        {!hasScripts ? (
                            <ActionCard
                                type="button"
                                variant="primary"
                                icon={<ScriptIcon aria-hidden="true" />}
                                title="Create example script"
                                description="Explore the editor with a pre-filled script."
                                error={exampleError}
                                disabled={isCreatingExample}
                                onClick={() => void createExample()}
                            />
                        ) : null}
                    </div>
                    {scriptsLoading ? (
                        <div className={styles.skeleton} aria-label="Loading scripts">
                            <Skeleton className={styles.skeletonSearch} />
                            <div className={styles.skeletonList}>
                                <Skeleton shape="block" />
                                <Skeleton shape="block" />
                                <Skeleton shape="block" />
                            </div>
                        </div>
                    ) : error ? (
                        <div className={styles.errorState}>
                            <Text variant="muted">Couldn&apos;t load your scripts.</Text>
                            <Button variant="outline" onPress={() => void refreshScripts()}>
                                Try again
                            </Button>
                        </div>
                    ) : scriptSummaries.length === 0 ? (
                        <Notice variant="empty" className={styles.emptyLibrary}>No scripts yet.</Notice>
                    ) : (
                        <div className={styles.library}>
                            {showLibraryTools ? (
                                <div className={styles.libraryTools}>
                                    <SearchInput
                                        value={query}
                                        aria-label="Search scripts"
                                        placeholder="Search by title or subtitle"
                                        onChange={event => setQuery(event.target.value)}
                                    />
                                    <Select
                                        value={sort}
                                        options={SORT_OPTIONS}
                                        ariaLabel="Sort scripts"
                                        className={styles.sortSelect}
                                        onChange={value => setSort(value as ScriptSort)}
                                    />
                                </div>
                            ) : null}
                            <ScriptListSection
                                scripts={dashboard.scripts}
                                onOpenScript={openScript}
                                onDeleteScript={deleteScript}
                                onRenameScript={renameScript}
                                onDuplicateScript={duplicateScript}
                            />
                            {dashboard.scripts.length === 0 ? (
                                <Notice variant="empty" className={styles.noResults}>
                                    No scripts match “{query.trim()}”.
                                </Notice>
                            ) : null}
                        </div>
                    )}
                </div>
            </PageContainer>
        </AppLayout>
    );
};
