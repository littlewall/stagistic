import {buildStepkgEntries} from './buildEntries';
import {STEPKG_EXTENSION} from './constants';
import type {BuildStepkgEntriesArgs, StepkgEntry, StepkgExportResult} from './contracts';
import {writeStepkgArchive} from './writeArchive';

export interface CreateStepkgArgs extends BuildStepkgEntriesArgs {
    writeArchive?: (entries: StepkgEntry[]) => Promise<Blob>;
}

const sanitizeFileName = (value: string): string => {
    const result = value.replace(/[<>:"/\\|?*]/g, '-').trim();
    return result.length > 0 && result !== '.' && result !== '..' ? result : 'Untitled';
};

export const createStepkg = async (args: CreateStepkgArgs): Promise<StepkgExportResult> => {
    const built = await buildStepkgEntries(args);
    if (!built.ok) return built;

    try {
        const blob = await (args.writeArchive ?? writeStepkgArchive)(built.entries);
        return {ok: true, blob, fileName: `${sanitizeFileName(args.snapshot.script.title)}${STEPKG_EXTENSION}`, manifest: built.manifest};
    } catch {
        return {ok: false, issues: [{code: 'archive_creation_failed', stage: 'archive'}]};
    }
};
