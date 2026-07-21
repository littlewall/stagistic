import type {
    MusicAttachmentRole,
    ScriptMusicAttachment,
    ScriptRepository,
} from '@stagistic/db';
import {useLiveQuery} from '@tanstack/react-db';
import {
    useCallback,
    useMemo,
    useState,
} from 'react';

import {useReactiveCollectionStatus} from '../collections';
import {getScriptAttachmentsStore} from './scriptAttachmentsStore';

export const useScriptAttachments = (
    scriptId: string | null,
    repository: ScriptRepository,
) => {
    const store = useMemo(() => scriptId
        ? getScriptAttachmentsStore(repository, scriptId)
        : null, [repository, scriptId]);
    const attachmentsStatus = useReactiveCollectionStatus(store?.attachmentsStatus);
    const bindingsStatus = useReactiveCollectionStatus(store?.bindingsStatus);
    const attachmentsQuery = useLiveQuery(q => {
        return store ? q.from({attachments: store.attachmentsCollection}) : undefined;
    }, [store]);
    const bindingsQuery = useLiveQuery(q => {
        return store ? q.from({bindings: store.bindingsCollection}) : undefined;
    }, [store]);
    const [uploadingMusicIds, setUploadingMusicIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<Error | null>(null);
    const byMusicRole = useMemo(() => {
        const attachments = new Map(
            (attachmentsQuery.data ?? []).map(attachment => [attachment.id, attachment]),
        );

        return new Map((bindingsQuery.data ?? []).flatMap(binding => {
            const attachment = attachments.get(binding.attachmentId);

            return attachment ? [[`${binding.musicId}:${binding.role}`, {...attachment, role: binding.role} satisfies ScriptMusicAttachment] as const] : [];
        }));
    }, [attachmentsQuery.data, bindingsQuery.data]);
    const upload = useCallback(async (
        musicId: string,
        role: MusicAttachmentRole,
        file: File,
    ) => {
        if (!store) {
            return;
        }

        setError(null);
        setUploadingMusicIds(previous => new Set(previous).add(musicId));

        try {
            await store.upload(musicId, role, {
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
            setUploadingMusicIds(previous => {
                const next = new Set(previous);

                next.delete(musicId);

                return next;
            });
        }
    }, [store]);
    const remove = useCallback(async (
        musicId: string,
        role: MusicAttachmentRole,
    ) => {
        setError(null);

        try {
            await store?.remove(musicId, role);
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
        byMusicRole,
        uploadingMusicIds,
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
