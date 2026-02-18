import {
    ensureFountainBlockIds,
    ensureSceneHeading,
    ensureScriptStructure,
    parseFountain,
    scriptDocumentFromFountainAst,
    type StructureSettings,
    trimOrFallback,
} from '@stagistic/script-core';

import {
    attachStructureFromMarkers,
    parseImportedSourceWithMarkers,
} from './scriptImportStructureMarkers';

const normalizeFountainSource = (source: string) => source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

export const parseImportedFountainScript = (
    source: string,
    options?: {
        structureSettings?: Partial<StructureSettings>,
    },
) => {
    const normalizedSource = normalizeFountainSource(source);
    const {transformedSource, pendingMarkers} = parseImportedSourceWithMarkers(
        normalizedSource,
        options?.structureSettings,
    );
    const parsed = parseFountain(transformedSource);
    const doc = scriptDocumentFromFountainAst(parsed);
    const withStructure = attachStructureFromMarkers(doc, pendingMarkers);
    const withIds = ensureFountainBlockIds(ensureSceneHeading(withStructure));

    return ensureScriptStructure(withIds);
};

export const resolveImportedScriptName = (name: string, fileName: string) => {
    const fileNameWithoutExtension = fileName.replace(/\.fountain$/i, '');
    const resolvedFromFileName = trimOrFallback(fileNameWithoutExtension, 'Untitled script');

    return trimOrFallback(name, resolvedFromFileName);
};

export const isSupportedImportFileName = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.fountain');
};
