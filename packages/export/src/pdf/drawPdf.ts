import {jsPDF} from 'jspdf';
import {PDFDocument} from 'pdf-lib';

import type {
    PageItem,
    StaffRowItem,
    TitlePageImageItem,
    TranscriptResult,
    VisualLine,
    VisualRun,
} from '../model/visualLine';
import {drawIntegratedPageNumber} from './drawIntegratedPageNumber';
import {drawStaffRow} from './drawStaffRow';
import {getPdfMonoFontFamily, registerFonts} from './fonts';
import {planIntegratedAssembly} from './planIntegratedAssembly';
import {appendScoreArtwork, embedScoreArtwork} from './scoreArtwork';

const PX_TO_PT = 72 / 96;

const isPageBreak = (item: PageItem): item is {type: '__page_break__'} => 'type' in item && item.type === '__page_break__';
const isStaffRow = (item: PageItem): item is StaffRowItem => 'type' in item && item.type === 'staff-row';
const isTitlePageImage = (item: PageItem): item is TitlePageImageItem => 'type' in item && item.type === 'title-page-image';
const getFontStyle = (run: VisualRun) => {
    if (run.bold && run.italic) {
        return 'bolditalic';
    }

    if (run.bold) {
        return 'bold';
    }

    return run.italic ? 'italic' : 'normal';
};

const drawUnderline = (doc: jsPDF, run: VisualRun, y: number) => {
    const xPt = run.x * PX_TO_PT;
    const yPt = (y + run.fontSizePx * 0.85) * PX_TO_PT;
    const width = doc.getTextWidth(run.text);

    doc.setLineWidth(0.4);
    doc.line(xPt, yPt, xPt + width, yPt);
};

const drawLine = (doc: jsPDF, line: VisualLine, monoFontFamily: string) => {
    line.runs.forEach(run => {
        const family = run.fontFamily.includes('Courier') ? monoFontFamily : 'Helvetica';

        doc.setFont(family, getFontStyle(run));
        doc.setFontSize(run.fontSizePx * PX_TO_PT);
        doc.text(run.text, run.x * PX_TO_PT, line.y * PX_TO_PT, {baseline: 'top'});

        if (run.underline) {
            drawUnderline(doc, run, line.y);
        }
    });
};

export const drawPdf = async (transcript: TranscriptResult): Promise<Blob> => {
    const pageWidthPt = transcript.pageWidthPx * PX_TO_PT;
    const pageHeightPt = transcript.pageHeightPx * PX_TO_PT;
    const doc = new jsPDF({
        unit: 'pt',
        format: [pageWidthPt, pageHeightPt],
    });

    let monoFontFamily = 'Courier';

    try {
        await registerFonts(doc);
        monoFontFamily = getPdfMonoFontFamily();
    } catch (error) {
        console.error('Export PDF font embedding failed; falling back to core Courier.', error);
    }

    transcript.items.forEach(item => {
        if (isPageBreak(item)) {
            doc.addPage();

            return;
        }

        if (isStaffRow(item)) {
            drawStaffRow(doc, item, monoFontFamily);

            return;
        }

        if (isTitlePageImage(item)) {
            doc.addImage(item.dataUrl, item.format, item.x * PX_TO_PT, item.y * PX_TO_PT, item.widthPx * PX_TO_PT, item.heightPx * PX_TO_PT);

            return;
        }

        drawLine(doc, item, monoFontFamily);
    });

    if (!transcript.integratedScores || transcript.integratedScores.length === 0) {
        return doc.output('blob');
    }

    const generated = await PDFDocument.load(doc.output('arraybuffer'));
    const result = await PDFDocument.create();
    const generatedPages = await result.copyPages(generated, generated.getPageIndices());
    const leadingPages = transcript.leadingPageCount ?? 0;
    const scorePagesByMusicId = new Map<string, Awaited<ReturnType<typeof embedScoreArtwork>>>();
    const scorePageCounts = new Map<string, number>();

    for (const score of transcript.integratedScores) {
        const buffer = transcript.scorePdfs?.[score.musicId];

        if (!buffer) {
            continue;
        }

        const scoreDocument = await PDFDocument.load(buffer);
        const pages = await embedScoreArtwork(result, scoreDocument);

        scorePagesByMusicId.set(score.musicId, pages);
        scorePageCounts.set(score.musicId, pages.length);
    }

    const assembly = planIntegratedAssembly({
        scriptPageSourceBlockIds: transcript.scriptPageSourceBlockIds ?? [],
        oddPageBlockIds: transcript.oddPageBlockIds,
        scores: transcript.integratedScores.map(score => ({
            musicId: score.musicId,
            startBlockId: score.startBlockId,
            afterBlockId: score.afterBlockId,
            pageCount: scorePageCounts.get(score.musicId) ?? 0,
        })),
    });

    for (let index = 0; index < leadingPages; index += 1) {
        result.addPage(generatedPages[index]);
    }

    const {width, height} = generatedPages[0].getSize();

    for (const [index, step] of assembly.steps.entries()) {
        if (step.kind === 'blank') {
            const blank = result.addPage([width, height]);

            await drawIntegratedPageNumber(result, blank, transcript, index + 1);
            continue;
        }

        if (step.kind === 'script') {
            result.addPage(generatedPages[leadingPages + (step.scriptPageIndex ?? 0)]);
            continue;
        }

        const score = scorePagesByMusicId.get(step.musicId ?? '')?.[step.scorePageIndex ?? 0];

        if (!score) continue;

        await appendScoreArtwork(result, score, transcript, index + 1);
    }

    const bytes = await result.save();

    return new Blob([bytes as unknown as BlobPart], {type: 'application/pdf'});
};
