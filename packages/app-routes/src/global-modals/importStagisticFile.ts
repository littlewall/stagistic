import {
    parseStagistic,
    type ScriptDocument,
    type TitlePageSettings,
    trimOrFallback,
} from '@stagistic/script';

interface ImportStagisticFileArgs {
    fileName: string,
    name: string,
    text: string,
    createScript: (name: string, document: ScriptDocument) => Promise<string>,
    saveTitlePage: (scriptId: string, settings: TitlePageSettings) => Promise<void>,
    rollbackScript: (scriptId: string) => Promise<void>,
}

export interface ImportStagisticFileResult {
    scriptId: string,
    scriptName: string,
}

const hasTitlePageSettings = (settings: TitlePageSettings) => {
    return Object.values(settings).some(value => value !== undefined);
};

export const importStagisticFile = async ({
    fileName,
    name,
    text,
    createScript,
    saveTitlePage,
    rollbackScript,
}: ImportStagisticFileArgs): Promise<ImportStagisticFileResult> => {
    if (!fileName.toLowerCase().endsWith('.stagistic')) {
        throw new Error('Only .stagistic files are supported.');
    }

    const parsed = parseStagistic(text);
    const fallbackName = parsed.title ?? 'Untitled script';
    const scriptName = trimOrFallback(name, fallbackName);
    const scriptId = await createScript(scriptName, parsed.document);

    try {
        if (hasTitlePageSettings(parsed.titlePage)) {
            await saveTitlePage(scriptId, parsed.titlePage);
        }
    } catch (error) {
        await rollbackScript(scriptId);
        throw error;
    }

    return {scriptId, scriptName};
};
