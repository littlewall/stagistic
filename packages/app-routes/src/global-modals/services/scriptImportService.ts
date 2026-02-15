import {
    ensureFountainBlockIds,
    ensureSceneHeading,
    parseFountain,
    scriptDocumentFromFountainAst,
    trimOrFallback,
} from '@stagistic/script-core';

const normalizeFountainSource = (source: string) => source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

export const parseImportedFountainScript = (source: string) => {
    const parsed = parseFountain(normalizeFountainSource(source));
    const doc = scriptDocumentFromFountainAst(parsed);

    return ensureFountainBlockIds(ensureSceneHeading(doc));
};

export const resolveImportedScriptName = (name: string, fileName: string) => {
    const fileNameWithoutExtension = fileName.replace(/\.fountain$/i, '');
    const resolvedFromFileName = trimOrFallback(fileNameWithoutExtension, 'Untitled script');

    return trimOrFallback(name, resolvedFromFileName);
};

export const isSupportedImportFileName = (fileName: string) => {
    return fileName.toLowerCase().endsWith('.fountain');
};
