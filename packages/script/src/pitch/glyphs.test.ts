import {
    describe, expect, it,
} from 'vite-plus/test';

import {
    ACCIDENTAL_GLYPHS,
    CLEF_GLYPHS,
    pathToSvgD,
} from './glyphs';

describe('glyphs', () => {
    it('exposes both clefs and both accidentals with non-empty commands', () => {
        expect(CLEF_GLYPHS.treble.commands.length).toBeGreaterThan(0);
        expect(CLEF_GLYPHS['treble-8vb'].commands.length).toBeGreaterThan(0);
        expect(ACCIDENTAL_GLYPHS.sharp.commands.length).toBeGreaterThan(0);
        expect(ACCIDENTAL_GLYPHS.flat.commands.length).toBeGreaterThan(0);
    });

    it('treble-8vb is the treble glyph plus extra "8" commands', () => {
        expect(CLEF_GLYPHS['treble-8vb'].commands.length)
            .toBeGreaterThan(CLEF_GLYPHS.treble.commands.length);
    });

    it('renders an SVG path string starting with a moveto', () => {
        const d = pathToSvgD(CLEF_GLYPHS.treble.commands);

        expect(d.startsWith('M')).toBe(true);
        expect(d).toContain('C');
        expect(d).toContain('Z');
    });

    it('uses filled Bravura outlines for both clefs', () => {
        expect(CLEF_GLYPHS.treble.paint).toBe('fill');
        expect(CLEF_GLYPHS['treble-8vb'].paint).toBe('fill');
    });
});
