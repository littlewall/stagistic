import {useScripts} from '@stagistic/app-core';
import {
    AppLayout,
    Button,
    Input,
    PageContainer,
    PageTitle,
    SearchIcon,
    Select,
    SubtleText,
} from '@stagistic/ui';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import {AppHeader} from '../../layout/AppHeader';
import {
    buildHomeDashboardModel,
    type ScriptSort,
} from './homeDashboardModel';
import styles from './HomeRoute.module.css';
import {ScriptListSection} from './ScriptListSection';

const SORT_OPTIONS = [{value: 'newest', label: 'Newest first'}, {value: 'title', label: 'Title A–Z'}];

export const HomeRoute = () => {
    const navigate = useNavigate();
    const {
        scriptSummaries,
        isLoading: scriptsLoading,
        error,
        refreshScripts,
    } = useScripts();
    const {openNewScript, openDeleteScript} = useGlobalModals();
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState<ScriptSort>('newest');

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

    if (scriptsLoading) {
        return (
            <AppLayout header={<AppHeader />}>
                <PageContainer variant="standard">
                    <div className={styles.skeleton}>
                        <div className={styles.skeletonTitle} />
                        <div className={styles.skeletonSearch} />
                        <div className={styles.skeletonList}>
                            <div className={styles.skeletonRow} />
                            <div className={styles.skeletonRow} />
                            <div className={styles.skeletonRow} />
                        </div>
                    </div>
                </PageContainer>
            </AppLayout>
        );
    }

    if (error) {
        return (
            <AppLayout header={<AppHeader />}>
                <PageContainer variant="standard">
                    <div className={styles.errorState}>
                        <SubtleText>Couldn&apos;t load your scripts.</SubtleText>
                        <Button variant="outline" onPress={() => void refreshScripts()}>
                            Try again
                        </Button>
                    </div>
                </PageContainer>
            </AppLayout>
        );
    }

    if (scriptSummaries.length === 0) {
        return (
            <AppLayout header={<AppHeader />}>
                <PageContainer variant="standard">
                    <div className={styles.emptyState}>
                        <PageTitle>Your script&apos;s next act.</PageTitle>
                        <SubtleText className={styles.emptySubtitle}>
                            A script editor for theatrical plays and musicals.
                            Create your first script to get started.
                        </SubtleText>
                        <div className={styles.emptyActions}>
                            <Button onPress={openNewScript}>New script</Button>
                        </div>
                    </div>
                </PageContainer>
            </AppLayout>
        );
    }

    return (
        <AppLayout header={<AppHeader />}>
            <PageContainer variant="standard">
                <div className={styles.content}>
                    <PageTitle>Scripts</PageTitle>
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
                    <div className={styles.sections}>
                        <ScriptListSection
                            title="Continue writing"
                            scripts={dashboard.continueWriting}
                            onOpenScript={openScript}
                            onDeleteScript={deleteScript}
                        />
                        <ScriptListSection
                            title="Recently edited"
                            scripts={dashboard.recentlyEdited}
                            onOpenScript={openScript}
                            onDeleteScript={deleteScript}
                        />
                        <ScriptListSection
                            title="All scripts"
                            scripts={dashboard.allScripts}
                            action={(
                                <Select
                                    value={sort}
                                    options={SORT_OPTIONS}
                                    ariaLabel="Sort all scripts"
                                    className={styles.sortSelect}
                                    onChange={value => setSort(value as ScriptSort)}
                                />
                            )}
                            onOpenScript={openScript}
                            onDeleteScript={deleteScript}
                        />
                        {dashboard.allScripts.length === 0 ? (
                            <SubtleText className={styles.noResults}>
                                No scripts match “{query.trim()}”.
                            </SubtleText>
                        ) : null}
                    </div>
                </div>
            </PageContainer>
        </AppLayout>
    );
};
