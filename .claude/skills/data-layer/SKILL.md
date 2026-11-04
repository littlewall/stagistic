---
name: data-layer
description: Use when adding a locally persisted script entity or changing a script-data mutation, store or reactive read. Excludes remote-only account data and purely visual changes.
---

# Script data layer

Read `docs/data-layer.md` for the current patterns and deliberate exceptions.
Persistent writes use `ScriptRepository`; app-core owns optimistic collections.
UI/editor receive values and actions, without db/react-db imports or optimistic
entity overlays. Unsubmitted form drafts and document sessions retain their own
editing contracts.

For simple mutations, follow `packages/app-core/src/music/scriptMusicStore.ts`
and its `useScriptMusic` consumer. A minimal update follows this pattern inside
an app-core store (using existing repository types):

```ts
const music = createReactiveCollection<ScriptMusic, string>({
    id: `script-music:${scriptId}`,
    source: repository.getScriptMusicSource(scriptId),
    getKey: row => row.id,
    handlers: {
        update: async (original, modified) => {
            const saved = await repository.updateScriptMusic(scriptId, original.id, {
                title: modified.title,
                kind: modified.kind === 'instrumental' ? 'instrumental' : 'song',
            });

            if (!saved) throw new Error('The music could not be updated');
        },
    },
});

const setTitle = async (id: string, title: string) => {
    const normalizedTitle = title.trim();

    if (!normalizedTitle || !music.collection.has(id)) return;

    const transaction = music.collection.update(id, draft => {
        draft.title = normalizedTitle;
    });

    await transaction.isPersisted.promise;
};

// In an app-core React hook, with the repository/script-scoped store:
const query = useLiveQuery(q => q.from({music: store.collection}), [store]);
// Pass query.data and store actions through the route into UI props.
```

Use the repository/script store registry for shared consumers. Supply only the
mutation handlers supported by the entity; allocate stable IDs before optimistic
inserts and account for durable timestamps returned by the repository.

For composed optimistic commands, inspect `scriptPlacesStore` and consider
`createOptimisticAction`; collection count alone does not choose the pattern.
It does not provide database atomicity. Preserve queues, foreign-key ordering,
confirmation and partial-success behavior. Keep documented pessimistic commands
when immediate optimistic visibility is not part of their contract.

Read optimistic collections for immediate entity feedback. Read confirmed source
snapshots when a durable list or draft reconciliation needs them. Trace the source
instead of trusting historical `confirmed*` variable names. Never feed a draft's
own optimistic echo back as an external confirmed edit.

Verify changed behavior at an existing public seam: pending visibility, rejection
rollback and overlapping writes. Include partial failure for composed commands.
Follow AGENTS.md for scoped checks. Do not add TanStack Query for local script
data, a speculative server abstraction, or a document schema bump for this work.
