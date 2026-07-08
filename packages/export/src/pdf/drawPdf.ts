import {jsPDF} from 'jspdf';

import type {
    PageItem,
    TranscriptResult,
    VisualLine,
    VisualRun,
} from '../visualLine';
import {
    getPdfMonoFontFamily,
    registerFonts,
} from './fonts';

const PX_TO_PT = 72 / 96;

const isPageBreak = (item: PageItem): item is {type: '__page_break__'} => 'type' in item && item.type === '__page_break__';
const getFontStyle = (run: VisualRun) => {
    if (run.bold && run.italic) {
        return 'bolditalic';
    }

    if (run.bold) {
        return 'bold';
    }

    return run.italic ? 'italic' : 'normal';
};

const drawUnderline = (
    doc: jsPDF,
    run: VisualRun,
    y: number,
) => {
    const xPt = run.x * PX_TO_PT;
    const yPt = (y + run.fontSizePx * 0.85) * PX_TO_PT;
    const width = doc.getTextWidth(run.text);

    doc.setLineWidth(0.4);
    doc.line(xPt, yPt, xPt + width, yPt);
};

const drawLine = (
    doc: jsPDF,
    line: VisualLine,
    monoFontFamily: string,
) => {
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

export const drawPdf = async (
    transcript: TranscriptResult,
): Promise<Blob> => {
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

        drawLine(doc, item, monoFontFamily);
    });

    return doc.output('blob');
};
