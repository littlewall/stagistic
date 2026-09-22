import {DEFAULT_EDITOR_SETTINGS, type TitlePageSettings} from '@stagistic/script';
import {describe, expect, it} from 'vite-plus/test';

import type {VisualLine} from '../visualLine';
import {buildTitlePageItems} from './buildTitlePageItems';

const {page} = DEFAULT_EDITOR_SETTINGS;
const CHAR_WIDTH_PX = DEFAULT_EDITOR_SETTINGS.typography.fontSizePx * 0.6;

const lineText = (line: VisualLine): string => line.runs.map(run => run.text).join('');

const findLine = (lines: VisualLine[], text: string): VisualLine | undefined => lines.find(line => lineText(line) === text);

describe('buildTitlePageItems', () => {
    it('always renders the title (bold), even with a null title page and empty script title', () => {
        const lines = buildTitlePageItems(null, '', DEFAULT_EDITOR_SETTINGS);

        expect(lines).toHaveLength(1);
        expect(lineText(lines[0])).toBe('Untitled');
        expect(lines[0].runs[0].bold).toBe(true);
        expect(lines[0].runs[0].fontFamily).toContain('Courier');
    });

    it('renders the script title, horizontally centered', () => {
        const lines = buildTitlePageItems(null, 'My Play', DEFAULT_EDITOR_SETTINGS);
        const run = lines[0].runs[0];
        const expectedX = (page.widthPx - 'My Play'.length * (run.fontSizePx * 0.6)) / 2;

        expect(lineText(lines[0])).toBe('My Play');
        expect(run.x).toBeCloseTo(expectedX);
    });

    it('joins a single author onto the credit line', () => {
        const titlePage: TitlePageSettings = {credits: [{credit: 'written by', authors: ['Jane Doe']}]};
        const lines = buildTitlePageItems(titlePage, 'T', DEFAULT_EDITOR_SETTINGS);

        expect(findLine(lines, 'written by Jane Doe')).toBeDefined();
    });

    it('joins multiple authors on one credit line, comma-separated', () => {
        const titlePage: TitlePageSettings = {credits: [{credit: 'book by', authors: ['Alice', 'Bob']}]};
        const lines = buildTitlePageItems(titlePage, 'T', DEFAULT_EDITOR_SETTINGS);

        expect(findLine(lines, 'book by Alice, Bob')).toBeDefined();
    });

    it('omits credit rows with no label and no authors', () => {
        const titlePage: TitlePageSettings = {
            credits: [
                {credit: '', authors: ['']},
                {credit: 'lyrics by', authors: ['Maria']},
            ],
        };
        const lines = buildTitlePageItems(titlePage, 'T', DEFAULT_EDITOR_SETTINGS);
        const creditLikeLines = lines.filter(line => lineText(line).includes('by'));

        expect(creditLikeLines).toHaveLength(1);
        expect(lineText(creditLikeLines[0])).toBe('lyrics by Maria');
    });

    it('right-aligns contact lines in italic and drops blank lines', () => {
        const titlePage: TitlePageSettings = {contact: 'Jane Doe\n\njane@example.com'};
        const lines = buildTitlePageItems(titlePage, 'T', DEFAULT_EDITOR_SETTINGS);
        const contactLine = findLine(lines, 'Jane Doe');

        expect(contactLine).toBeDefined();
        expect(contactLine?.runs[0].italic).toBe(true);
        expect(contactLine?.runs[0].x).toBeCloseTo(page.widthPx - page.marginRightPx - 'Jane Doe'.length * CHAR_WIDTH_PX);
        expect(findLine(lines, 'jane@example.com')).toBeDefined();
        expect(findLine(lines, '')).toBeUndefined();
    });

    it('renders the manual draft date at the left margin', () => {
        const titlePage: TitlePageSettings = {
            draftDateMode: 'manual',
            draftDate: '2026-07-08',
            dateFormat: 'dmy',
        };
        const lines = buildTitlePageItems(titlePage, 'T', DEFAULT_EDITOR_SETTINGS);
        const dateLine = findLine(lines, '08/07/2026');

        expect(dateLine).toBeDefined();
        expect(dateLine?.runs[0].x).toBe(page.marginLeftPx);
    });

    it('renders copyright only when set', () => {
        const without = buildTitlePageItems({}, 'T', DEFAULT_EDITOR_SETTINGS);
        const withCopyright = buildTitlePageItems({copyright: '© 2026 Jane Doe'}, 'T', DEFAULT_EDITOR_SETTINGS);

        expect(findLine(without, '© 2026 Jane Doe')).toBeUndefined();
        expect(findLine(withCopyright, '© 2026 Jane Doe')).toBeDefined();
    });

    it('renders subtitle below the title and source in italic', () => {
        const titlePage: TitlePageSettings = {subtitle: 'A Comedy', source: 'na motivy X'};
        const lines = buildTitlePageItems(titlePage, 'My Play', DEFAULT_EDITOR_SETTINGS);
        const subtitle = findLine(lines, 'A Comedy');
        const source = findLine(lines, 'na motivy X');

        expect(subtitle).toBeDefined();
        expect(subtitle && subtitle.y).toBeGreaterThan(lines[0].y);
        expect(source?.runs[0].italic).toBe(true);
    });

    it('keeps the title below a tall logo', () => {
        const titlePage: TitlePageSettings = {
            logo: {
                dataUrl: 'data:image/png;base64,aGVsbG8=',
                filename: 'logo.png',
                mimeType: 'image/png',
                widthPx: 400,
                heightPx: 1000,
                sizeBytes: 5,
            },
        };
        const lines = buildTitlePageItems(titlePage, 'My Play', DEFAULT_EDITOR_SETTINGS);

        expect(lines[0].y).toBeGreaterThan(DEFAULT_EDITOR_SETTINGS.page.heightPx * 0.28);
    });
});
