import type {ScriptCommentThread} from '@stagistic/app-core';
import type {CommentAnchorLocation} from '@stagistic/editor';
import type {ReactNode} from 'react';

import styles from './ScriptCommentsSidebar.module.css';

interface CommentsListViewProps {
    threads: readonly ScriptCommentThread[];
    anchors: ReadonlyMap<string, CommentAnchorLocation>;
    renderCard: (thread: ScriptCommentThread, options: {showQuote: boolean}) => ReactNode;
}

interface SceneGroup {
    key: string;
    title: string;
    threads: ScriptCommentThread[];
}

const groupByScene = (threads: readonly ScriptCommentThread[], anchors: ReadonlyMap<string, CommentAnchorLocation>) => {
    const anchored = threads
        .filter(thread => anchors.has(thread.id))
        .sort((left, right) => {
            const leftAnchor = anchors.get(left.id);
            const rightAnchor = anchors.get(right.id);

            return (leftAnchor?.from ?? 0) - (rightAnchor?.from ?? 0);
        });
    const groups: SceneGroup[] = [];

    anchored.forEach(thread => {
        const anchor = anchors.get(thread.id);
        const key = anchor?.sceneBlockId ?? 'no-scene';
        const last = groups.at(-1);

        if (last?.key === key) {
            last.threads.push(thread);

            return;
        }

        groups.push({key, title: anchor?.sceneTitle || 'No scene', threads: [thread]});
    });

    return groups;
};

/** Every thread matching the filter, in script order by scene, then Detached ones. */
export const CommentsListView = ({threads, anchors, renderCard}: CommentsListViewProps) => {
    const groups = groupByScene(threads, anchors);
    const detached = threads.filter(thread => !anchors.has(thread.id));

    return (
        <div className={styles.list}>
            {groups.map(group => (
                <section key={group.key} className={styles.section} aria-label={group.title}>
                    <h3 className={styles.sectionTitle}>{group.title}</h3>
                    <div className={styles.cards}>{group.threads.map(thread => renderCard(thread, {showQuote: true}))}</div>
                </section>
            ))}
            {detached.length > 0 ? (
                <section className={styles.section} aria-label="Detached">
                    <h3 className={styles.sectionTitle}>Detached</h3>
                    <div className={styles.cards}>{detached.map(thread => renderCard(thread, {showQuote: true}))}</div>
                </section>
            ) : null}
        </div>
    );
};
