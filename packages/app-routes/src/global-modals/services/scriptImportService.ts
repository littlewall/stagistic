import {
    ensureFountainBlockIds,
    ensureSceneHeading,
    ensureScriptStructure,
    parseFountain,
    type ParseFountainOptions,
    scriptDocumentFromFountainAst,
    type StructureSettings,
    trimOrFallback,
} from '@stagistic/script';

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
        enableLegacyCapsLyricsHeuristic?: boolean,
    },
) => {
    const normalizedSource = normalizeFountainSource(source);
    const {
        transformedSource,
        pendingSynopsisMarkers,
        pendingTitlePageFields,
    } = parseImportedSourceWithMarkers(
        normalizedSource,
        options?.structureSettings,
    );
    const parseOptions: ParseFountainOptions = {
        enableLegacyCapsLyricsHeuristic: options?.enableLegacyCapsLyricsHeuristic ?? false,
    };
    const parsed = parseFountain(transformedSource, parseOptions);
    const doc = scriptDocumentFromFountainAst(parsed);
    const withStructure = attachStructureFromMarkers(
        doc,
        pendingSynopsisMarkers,
        pendingTitlePageFields,
    );
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
