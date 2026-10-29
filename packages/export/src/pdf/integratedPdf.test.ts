import {DEFAULT_EDITOR_SETTINGS, mergeEditorSettings} from '@stagistic/script';
import {
    decodePDFRawStream,
    degrees,
    PDFArray,
    PDFDocument,
    PDFRawStream,
    StandardFonts,
} from 'pdf-lib';
import {
    expect,
    it,
    vi,
} from 'vite-plus/test';

import {INTEGRATED_SCORE_DEFAULTS} from '../model/config';
import {deriveIntegratedScoreExportPlan} from '../plan/deriveIntegratedScoreExportPlan';
import {numberedScript} from '../test/numberedScript';
import {transcribeExportPlan} from '../transcript/transcribeExportPlan';
import {drawPdf} from './drawPdf';

vi.mock('./fonts', () => ({registerFonts: async () => {}, getPdfMonoFontFamily: () => 'Courier'}));

const pageOperators = (doc: PDFDocument, index: number) => {
    const contents = doc.getPage(index).node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map(item => doc.context.lookup(item)) : [contents];

    return streams.filter((item): item is PDFRawStream => item instanceof PDFRawStream).map(stream => new TextDecoder().decode(decodePDFRawStream(stream).decode())).join('\n');
};

it('numbers landscape scores without a footer token or painting over imported artwork', async () => {
    const score = await PDFDocument.create();
    const font = await score.embedFont(StandardFonts.Helvetica);

    for (let i = 0; i < 2; i += 1) {
        const page = score.addPage([792, 612]);

        page.drawText(`SCORE ART ${i + 1}`, {
            x: 24,
            y: 550,
            font,
            size: 24,
        });
        page.drawText('Copyright at the bottom edge', {
            x: 24,
            y: 4,
            font,
            size: 10,
        });
    }

    const buffer = (await score.save()).buffer as ArrayBuffer;
    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {headerFooter: {
        header: {right: {text: '{{page}}.'}},
        footer: {
            left: {text: ''},
            center: {text: ''},
            right: {text: ''},
        },
    }});
    const plan = deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, numberedScript);
    const transcript = transcribeExportPlan(plan, settings, {scorePageCounts: {song: 2}});

    transcript.scorePdfs = {song: buffer};

    const blob = await drawPdf(transcript);
    const bytes = await blob.arrayBuffer();
    const result = await PDFDocument.load(bytes);
    const leading = transcript.leadingPageCount ?? 0;
    const firstScore = result.getPage(leading + 4);

    expect(firstScore.getSize()).toEqual({width: 792, height: 612});
    expect(result.getPageCount()).toBe(leading + 7);

    const operations = pageOperators(result, leading + 4);

    const positions = [...operations.matchAll(/1 0 0 1 [\d.-]+ ([\d.-]+) Tm/gu)].map(match => Number(match[1]));

    expect(positions.at(-1)).toBeGreaterThanOrEqual(0);
    expect(positions.at(-1)).toBeLessThan(612);
    expect(operations).toContain('<352E>'); // printed integrated page 5.
    expect(operations).toMatch(/\bDo\b/u); // embedded original artwork
    expect(operations).not.toMatch(/\bre\b/u); // no rectangle clearing the copyright area
    expect(pageOperators(result, leading + 5)).toContain('<362E>');
});

it.each([
    0,
    90,
    180,
    270,
].flatMap(rotation => [false, true].map(empty => ({rotation, empty}))))('preserves rotated or empty score sheets ($rotation degrees, empty=$empty)', async ({rotation, empty}) => {
    const score = await PDFDocument.create();
    const page = score.addPage([612, 792]);

    page.setRotation(degrees(rotation));

    if (!empty) page.drawText('Rotated artwork', {x: 24, y: 24});

    const plan = deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, numberedScript);
    const transcript = transcribeExportPlan(plan, DEFAULT_EDITOR_SETTINGS, {scorePageCounts: {song: 1}});

    transcript.scorePdfs = {song: (await score.save()).buffer as ArrayBuffer};

    const result = await PDFDocument.load(await (await drawPdf(transcript)).arrayBuffer());
    const index = (transcript.leadingPageCount ?? 0) + 4;

    expect(result.getPage(index).getSize()).toEqual(rotation === 90 || rotation === 270 ? {width: 792, height: 612} : {width: 612, height: 792});
    expect(pageOperators(result, index)).toContain('<352E>');

    if (!empty) {
        const matrices = pageOperators(result, index).split('\n').filter(line => line.endsWith(' cm'))
            .map(line => line.split(' ').slice(0, 4).map(Number));
        const angle = (-rotation * Math.PI) / 180;
        const expected = [
            Math.cos(angle),
            Math.sin(angle),
            -Math.sin(angle),
            Math.cos(angle),
        ];

        expect(matrices.some(matrix => matrix.every((value, i) => Math.abs(value - expected[i]) < 1e-12))).toBe(true);
    }
});

const lastTextPosition = (operators: string) => {
    const positions = [...operators.matchAll(/(?:1 0 0 1 )?([\d.-]+) ([\d.-]+) T[dm]/gu)];
    const match = positions.at(-1);

    if (!match) throw new Error('Missing page number position');

    return {x: Number(match[1]), y: Number(match[2])};
};

it.each([
    'left',
    'center',
    'right',
    'fallback',
] as const)('uses the script footer position on full-size score pages (%s)', async alignment => {
    const score = await PDFDocument.create();

    score.addPage([792, 612]).drawText('Original score', {x: 24, y: 550});

    const footer = {
        left: {text: ''},
        center: {text: ''},
        right: {text: ''},
    };

    if (alignment !== 'fallback') footer[alignment].text = '{{page_number}}';

    const settings = mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, {headerFooter: {footer}});
    const transcript = transcribeExportPlan(deriveIntegratedScoreExportPlan(INTEGRATED_SCORE_DEFAULTS, numberedScript), settings, {scorePageCounts: {song: 1}});

    transcript.scorePdfs = {song: (await score.save()).buffer as ArrayBuffer};

    const result = await PDFDocument.load(await (await drawPdf(transcript)).arrayBuffer());
    const leading = transcript.leadingPageCount ?? 0;
    const scriptPage = result.getPage(leading);
    const scorePage = result.getPage(leading + 4);
    const scriptPosition = lastTextPosition(pageOperators(result, leading));
    const scoreOperators = pageOperators(result, leading + 4);
    const scorePosition = lastTextPosition(scoreOperators);
    const widthDelta = scorePage.getWidth() - scriptPage.getWidth();
    const fraction = alignment === 'left' ? 0 : alignment === 'right' ? 1 : 0.5;

    expect(scorePosition.x).toBeCloseTo(scriptPosition.x + widthDelta * fraction, 5);
    expect(scorePosition.y).toBeCloseTo(scriptPosition.y, 5);

    const transforms = scoreOperators.split('\n').filter(line => line.endsWith(' cm')).map(line => line.split(' ').slice(0, 4).map(Number));
    const scale = transforms.reduce((product, matrix) => product * (matrix[0] * matrix[3] - matrix[1] * matrix[2]), 1);

    expect(scale).toBeCloseTo(1, 12);
});
