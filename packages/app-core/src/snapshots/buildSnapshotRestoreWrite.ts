import type {ScriptPackageWrite} from '@stagistic/db';
import {
    collectCommentAnchorThreadIds,
    getScriptBlockId,
    stripCommentAnchors,
} from '@stagistic/script';
import type {StepkgSnapshot} from '@stagistic/stepkg';

import {mapStepkgSnapshotToPackageWrite} from '../stepkg/mapStepkgSnapshotToPackageWrite';

/**
 * Write input for restoring a stored snapshot into its own script.
 *
 * The snapshot supplies the written script: document, structure, characters
 * and music with their attachments. The current script keeps its title,
 * settings and title page. Comments follow the text: a current thread stays
 * only if its anchor exists in the restored document, and anchors of threads
 * that no longer exist are stripped, so deleted threads never come back.
 */
export const buildSnapshotRestoreWrite = (
    target: StepkgSnapshot,
    current: StepkgSnapshot,
    now: number,
): ScriptPackageWrite => {
    const blockIds = new Set(target.document.content.flatMap(node => getScriptBlockId(node) ?? []));
    const rangeThreadIds = collectCommentAnchorThreadIds(target.document);
    const threads = current.comments.threads.filter(thread => {
        if (thread.anchorKind === 'block') {
            return thread.anchorBlockId !== null && blockIds.has(thread.anchorBlockId);
        }

        return rangeThreadIds.has(thread.id);
    });
    const keptThreadIds = new Set(threads.map(thread => thread.id));
    const write = mapStepkgSnapshotToPackageWrite({
        ...target,
        script: current.script,
        titlePage: current.titlePage,
        settings: current.settings,
        document: stripCommentAnchors(target.document, keptThreadIds),
        comments: {
            threads,
            messages: current.comments.messages.filter(message => keptThreadIds.has(message.threadId)),
        },
    }, 'existing-storage-keys');

    write.script.updatedAt = now;

    return write;
};
