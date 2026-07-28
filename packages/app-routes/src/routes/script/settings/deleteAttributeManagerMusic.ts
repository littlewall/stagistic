import {
    removeMusicFromScriptDocument,
    type ScriptDocument,
} from '@stagistic/script';

export interface DeleteAttributeManagerMusicArgs {
    document: ScriptDocument | null,
    musicId: string,
    applyDocumentChange: (change: {
        value: ScriptDocument,
        changed: boolean,
    }) => Promise<boolean>,
    deleteMusic: (musicId: string) => Promise<void>,
}

export const deleteAttributeManagerMusic = async ({
    document,
    musicId,
    applyDocumentChange,
    deleteMusic,
}: DeleteAttributeManagerMusicArgs) => {
    if (document) {
        const change = removeMusicFromScriptDocument(document, musicId);

        if (change.changed) {
            const didSave = await applyDocumentChange(change);

            if (!didSave) {
                throw new Error('The music markers could not be removed');
            }
        }
    }

    await deleteMusic(musicId);
};
