import {
    type ScriptEditingSession,
    ScriptEditingSessionProvider,
    useScriptEditingSession,
    useScriptEditingSessionOpener,
    useScriptRepository,
    useScriptSummary,
} from '@stagistic/app-core';
import type {ScriptDocumentSession} from '@stagistic/editor';
import {getUnsavedWorkParticipants} from '@stagistic/shared';
import {LoaderOverlay} from '@stagistic/ui';
import {
    type ReactNode,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import {
    getScriptBasePath,
    type ScriptAccess,
    ScriptAccessProvider,
} from './ScriptAccessContext';
import {ScriptEditingBanner} from './ScriptEditingBanner';

/** Registers what another tab's takeover flushes while this tab edits. */
export const useEditingParticipant = (documentSession: ScriptDocumentSession | null, isReadOnly: boolean) => {
    const editing = useScriptEditingSession();

    useEffect(() => {
        if (!documentSession || isReadOnly || !editing) {
            return;
        }

        // Another tab asking for editing: stop typing, save everything, then let go.
        return editing.registerParticipant({
            flush: async () => {
                documentSession.stopEditing();
                getUnsavedWorkParticipants().forEach(participant => participant.stopEditing?.());

                const results = await Promise.all([
                    documentSession.flush(),
                    ...getUnsavedWorkParticipants().map(participant => participant.flush().catch(() => false)),
                ]);

                return results.every(Boolean);
            },
            isDirty: () => documentSession.getSnapshot().isDirty,
            getText: () => documentSession.getText(),
        });
    }, [
        documentSession,
        editing,
        isReadOnly,
    ]);
};

const LockedLiveScriptEditing = ({
    session,
    scriptId,
    children,
}: {
    session: ScriptEditingSession,
    scriptId: string | undefined,
    children: (loadEpoch: number) => ReactNode,
}) => {
    const repository = useScriptRepository();
    const {script, summary} = useScriptSummary(scriptId);
    const state = useSyncExternalStore(session.subscribe, session.getState);
    const isReadOnly = state.role === 'read-only';
    const [seen, setSeen] = useState<{epoch: number, revision: number | null}>({epoch: state.loadEpoch, revision: null});

    /*
     * The revision this tab shows is read from the database as the text loads,
     * so a save of this very tab (a handover flush) is not mistaken for news.
     */
    useEffect(() => {
        if (!scriptId) {
            return;
        }

        let isActive = true;

        void repository.getScriptSummary(scriptId).then(stored => {
            if (isActive) {
                setSeen({epoch: state.loadEpoch, revision: stored?.revision ?? null});
            }
        }).catch(() => {});

        return () => {
            isActive = false;
        };
    }, [
        repository,
        scriptId,
        state.loadEpoch,
    ]);

    const hasNewChanges = isReadOnly
        && seen.epoch === state.loadEpoch
        && seen.revision !== null
        && summary?.revision !== undefined
        && summary.revision > seen.revision;
    const access = useMemo<ScriptAccess>(() => ({
        isReadOnly,
        snapshot: null,
        liveRepository: repository,
        liveScriptTitle: script?.name ?? null,
        basePath: scriptId ? getScriptBasePath(scriptId) : null,
    }), [
        isReadOnly,
        repository,
        script?.name,
        scriptId,
    ]);

    if (state.role === 'acquiring') {
        return <LoaderOverlay label="Preparing editor" messages={['Loading your script']} />;
    }

    return (
        <ScriptEditingSessionProvider session={session}>
            <ScriptAccessProvider value={access}>
                {children(state.loadEpoch)}
            </ScriptAccessProvider>
            <ScriptEditingBanner session={session} state={state} hasNewChanges={hasNewChanges} />
        </ScriptEditingSessionProvider>
    );
};

/** One tab edits a script at a time; the others see it read-only with the way to take over. */
export const LiveScriptEditing = ({
    scriptId,
    children,
}: {
    scriptId: string | undefined,
    children: (loadEpoch: number) => ReactNode,
}) => {
    const session = useScriptEditingSessionOpener(scriptId);

    if (!session) {
        return <LoaderOverlay label="Preparing editor" messages={['Loading your script']} />;
    }

    return <LockedLiveScriptEditing key={scriptId} session={session} scriptId={scriptId}>{children}</LockedLiveScriptEditing>;
};
