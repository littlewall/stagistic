import {PDFDocument} from 'pdf-lib';

/**
 * Page counts for attached score PDFs, needed before transcription so the
 * Contents page can print integrated page numbers. A score that fails to parse
 * is omitted, which the assembly planner treats as absent.
 */
export const readPdfPageCounts = async (
    scorePdfs: Record<string, ArrayBuffer>,
): Promise<Record<string, number>> => {
    const entries = await Promise.all(Object.entries(scorePdfs).map(async ([musicId, buffer]) => {
        try {
            const document = await PDFDocument.load(buffer);

            return [musicId, document.getPageCount()] as const;
        } catch {
            return null;
        }
    }));

    return Object.fromEntries(entries.filter((entry): entry is readonly [string, number] => entry !== null));
};
