import type {
    CueAttachmentRole,
    ScriptCueAttachment,
    ScriptRepository,
} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react';

import {getScriptAttachmentsStore} from './scriptAttachmentsStore';

const emptyStatus = {
    isReady: true,
    sourceError: null,
    mutations: [],
} as const;
const getEmptyStatus = () => emptyStatus;
const subscribeEmpty = () => () => undefined;

export const useScriptAttachments = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptAttachmentsStore(repository, scriptId)
        : null, [repository, scriptId]);
    const attachmentsStatus = useSyncExternalStore(
        store?.attachmentsStatus.subscribe ?? subscribeEmpty,
        store?.attachmentsStatus.getSnapshot ?? getEmptyStatus,
        store?.attachmentsStatus.getSnapshot ?? getEmptyStatus,
    );
    const bindingsStatus = useSyncExternalStore(
        store?.bindingsStatus.subscribe ?? subscribeEmpty,
        store?.bindingsStatus.getSnapshot ?? getEmptyStatus,
        store?.bindingsStatus.getSnapshot ?? getEmptyStatus,
    );
    const attachmentsQuery = useLiveQuery(q => {
        return store ? q.from({attachments: store.attachmentsCollection}) : undefined;
    }, [store]);
    const bindingsQuery = useLiveQuery(q => {
        return store ? q.from({bindings: store.bindingsCollection}) : undefined;
    }, [store]);
    const [uploadingCueIds, setUploadingCueIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<Error | null>(null);
    const byCueRole = useMemo(() => {
        const attachments = new Map(
            (attachmentsQuery.data ?? []).map(attachment => [attachment.id, attachment]),
        );

        return new Map((bindingsQuery.data ?? []).flatMap(binding => {
            const attachment = attachments.get(binding.attachmentId);

            return attachment ? [[`${binding.cueId}:${binding.role}`, {...attachment, role: binding.role} satisfies ScriptCueAttachment] as const] : [];
        }));
    }, [attachmentsQuery.data, bindingsQuery.data]);
    const upload = useCallback(async (
        cueId: string,
        role: CueAttachmentRole,
        file: File,
    ) => {
        if (!store) {
            return;
        }

        setError(null);
        setUploadingCueIds(previous => new Set(previous).add(cueId));

        try {
            await store.upload(cueId, role, {
                name: file.name,
                type: file.type,
                size: file.size,
                blob: file,
            });
        } catch (uploadError) {
            setError(uploadError instanceof Error
                ? uploadError
                : new Error(String(uploadError)));
            throw uploadError;
        } finally {
            setUploadingCueIds(previous => {
                const next = new Set(previous);

                next.delete(cueId);

                return next;
            });
        }
    }, [store]);
    const remove = useCallback(async (
        cueId: string,
        role: CueAttachmentRole,
    ) => {
        setError(null);

        try {
            await store?.remove(cueId, role);
        } catch (removeError) {
            setError(removeError instanceof Error
                ? removeError
                : new Error(String(removeError)));
            throw removeError;
        }
    }, [store]);
    const getBlob = useCallback((storageKey: string) => {
        return repository.getAttachmentBlob(storageKey);
    }, [repository]);

    return {
        byCueRole,
        uploadingCueIds,
        isLoading: Boolean(store) && (
            !attachmentsStatus.isReady
            || !bindingsStatus.isReady
            || attachmentsQuery.isLoading
            || bindingsQuery.isLoading
        ),
        error: error ?? attachmentsStatus.sourceError ?? bindingsStatus.sourceError,
        upload,
        remove,
        getBlob,
    };
};
