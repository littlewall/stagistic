interface FailableDraft {
    error: Error | null,
    retry: () => Promise<unknown>,
}

/** First failed draft's error, plus a retry that reruns every failed draft. */
export const combineDraftSaveErrors = (drafts: readonly FailableDraft[]) => ({
    error: drafts.find(draft => draft.error)?.error ?? null,
    retry: () => {
        void Promise.allSettled(drafts.map(draft => (draft.error ? draft.retry() : Promise.resolve())));
    },
});
