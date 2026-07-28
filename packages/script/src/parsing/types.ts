import type {ScriptDocument} from '../document';
import type {TitlePageSettings} from '../titlePage';

export interface ParseStagisticResult {
    document: ScriptDocument,
    title?: string,
    titlePage: TitlePageSettings,
}

export class StagisticParseError extends Error {
    readonly line: number | null;

    constructor(message: string, line: number | null = null) {
        super(line === null ? message : `Line ${line}: ${message}`);
        this.name = 'StagisticParseError';
        this.line = line;
    }
}
