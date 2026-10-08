import {
    coerceUnknownBlocksToStageDirections,
    ensureSceneHeading,
    ensureScriptBlockIds,
    ensureScriptStructure,
    type ScriptDocument,
} from '@stagistic/script';

/**
 * Normalization that used to run on every load (`useScriptLoader`). With a
 * shared Y.Doc it runs exactly once, when the doc is seeded: inserting
 * blocks on every open would duplicate them across replicas.
 */
export const prepareSeedDocument = (stored: ScriptDocument | null): ScriptDocument => {
    if (!stored) {
        return ensureScriptStructure(ensureSceneHeading(null));
    }

    const coerced = coerceUnknownBlocksToStageDirections(stored).value;

    return ensureScriptStructure(ensureSceneHeading(ensureScriptBlockIds(coerced)));
};
