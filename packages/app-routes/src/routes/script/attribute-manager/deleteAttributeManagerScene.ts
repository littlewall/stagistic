import {buildDeleteSceneHeadingContent} from '@stagistic/editor';
import type {ScriptDocument} from '@stagistic/script';

export interface DeleteAttributeManagerSceneArgs {
    document: ScriptDocument | null,
    sceneHeadingBlockId: string,
    applyDocumentChange: (change: {
        value: ScriptDocument,
        changed: boolean,
    }) => Promise<boolean>,
}

/**
 * Removes a scene heading block from the working document (its synopsis and
 * places are pruned by the projection). Mirrors {@link deleteAttributeManagerMusic}:
 * the change flows through `applyDocumentChange`, which persists and re-renders
 * the live editor — the attribute manager cannot reach the editor's live
 * `deleteSceneRequest` channel.
 */
export const deleteAttributeManagerScene = async ({
    document,
    sceneHeadingBlockId,
    applyDocumentChange,
}: DeleteAttributeManagerSceneArgs) => {
    if (!document) {
        return;
    }

    const nextDocument = buildDeleteSceneHeadingContent(document, sceneHeadingBlockId);

    if (!nextDocument) {
        return;
    }

    const didSave = await applyDocumentChange({
        value: nextDocument,
        changed: true,
    });

    if (!didSave) {
        throw new Error('The scene heading could not be removed');
    }
};
