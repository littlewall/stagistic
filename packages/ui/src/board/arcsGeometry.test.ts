import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {
    type ArcGeometryPoint,
    buildMonotonePath,
    createArcsLayout,
    type CubicSegment,
    monotoneCubicSegments,
    selectSceneNumbers,
    spokenArcValue,
    stepArcValue,
} from './arcsGeometry';

/** A cubic Bezier sampled at `t` in [0, 1]. */
const sampleCubic = (segment: CubicSegment, t: number): ArcGeometryPoint => {
    const {
        start: p0,
        control1: p1,
        control2: p2,
        end: p3,
    } = segment;
    const u = 1 - t;
    const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
    const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;

    return {x, y};
};

const sampleYs = (segment: CubicSegment) => Array.from(
    {length: 101},
    (_, index) => sampleCubic(segment, index / 100).y,
);

describe('monotoneCubicSegments', () => {
    it('returns no segments for fewer than two points', () => {
        expect(monotoneCubicSegments([])).toEqual([]);
        expect(monotoneCubicSegments([{x: 0, y: 5}])).toEqual([]);
    });

    it('joins consecutive points with one segment per gap, starting at the first point', () => {
        const points = [
            {x: 0, y: 0},
            {x: 10, y: 40},
            {x: 20, y: -20},
        ];

        const segments = monotoneCubicSegments(points);

        expect(segments).toHaveLength(2);
        expect(segments[0].start).toEqual(points[0]);
        expect(segments[0].end).toEqual(points[1]);
        expect(segments[1].start).toEqual(points[1]);
        expect(segments[1].end).toEqual(points[2]);
    });

    it('never overshoots the neighbouring points of a monotone rise', () => {
        const points = [
            {x: 0, y: -80},
            {x: 10, y: -20},
            {x: 20, y: 10},
            {x: 30, y: 70},
        ];

        monotoneCubicSegments(points).forEach(segment => {
            const ys = sampleYs(segment);

            ys.forEach(y => {
                expect(y).toBeGreaterThanOrEqual(Math.min(segment.start.y, segment.end.y));
                expect(y).toBeLessThanOrEqual(Math.max(segment.start.y, segment.end.y));
            });
        });
    });

    it('is monotone where the data is monotone', () => {
        const points = [
            {x: 0, y: -80},
            {x: 10, y: -20},
            {x: 20, y: 10},
            {x: 30, y: 70},
        ];

        const allYs = monotoneCubicSegments(points).flatMap(sampleYs);

        allYs.forEach((y, index) => {
            if (index > 0) expect(y).toBeGreaterThanOrEqual(allYs[index - 1]);
        });
    });

    it('holds a local peak flat instead of overshooting it', () => {
        const points = [
            {x: 0, y: 0},
            {x: 10, y: 90},
            {x: 20, y: 0},
            {x: 30, y: -90},
        ];

        const allYs = monotoneCubicSegments(points).flatMap(sampleYs);

        allYs.forEach(y => {
            expect(y).toBeLessThanOrEqual(90);
            expect(y).toBeGreaterThanOrEqual(-90);
        });
    });
});

describe('buildMonotonePath', () => {
    it('is empty for fewer than two points', () => {
        expect(buildMonotonePath([])).toBe('');
        expect(buildMonotonePath([{x: 0, y: 5}])).toBe('');
    });

    it('starts at the first point and draws one cubic per gap', () => {
        const path = buildMonotonePath([
            {x: 0, y: 0},
            {x: 10, y: 40},
            {x: 20, y: -20},
        ]);

        expect(path.startsWith('M0 0')).toBe(true);
        expect(path.match(/C/g)).toHaveLength(2);
    });
});

describe('selectSceneNumbers', () => {
    it('returns nothing for a scene-less chart or a non-positive space', () => {
        expect(selectSceneNumbers(0, 400, 40)).toEqual([]);
        expect(selectSceneNumbers(5, 0, 40)).toEqual([]);
        expect(selectSceneNumbers(5, 400, 0)).toEqual([]);
    });

    it('shows every number while they all fit', () => {
        expect(selectSceneNumbers(4, 400, 40)).toEqual([
            0,
            1,
            2,
            3,
        ]);
    });

    it('thins so labels never overlap at the given width', () => {
        const indices = selectSceneNumbers(10, 300, 60);
        const columnWidth = 300 / 10;

        expect(indices.length).toBeLessThan(10);
        expect(indices[0]).toBe(0);

        indices.slice(1).forEach((index, position) => {
            const gap = index - indices[position];

            expect(gap * columnWidth).toBeGreaterThanOrEqual(60);
        });
    });

    it('thins out more for a wider widest label, never overlapping at any width', () => {
        const count = 40;

        [
            200,
            333,
            640,
            1000,
        ].forEach(width => {
            const columnWidth = width / count;
            const counts = [
                16,
                32,
                64,
            ].map(labelWidth => {
                const indices = selectSceneNumbers(count, width, labelWidth);

                indices.slice(1).forEach((index, position) => {
                    expect((index - indices[position]) * columnWidth).toBeGreaterThanOrEqual(labelWidth);
                });

                return indices.length;
            });

            expect(counts[0]).toBeGreaterThanOrEqual(counts[1]);
            expect(counts[1]).toBeGreaterThanOrEqual(counts[2]);
        });
    });

    it('shows nothing when even one label cannot fit', () => {
        expect(selectSceneNumbers(6, 30, 40)).toEqual([]);
    });
});

describe('spokenArcValue', () => {
    it('says neutral at zero', () => {
        expect(spokenArcValue(0)).toBe('neutral');
    });

    it('uses the third-of-range words on their boundaries', () => {
        expect(spokenArcValue(1)).toBe('slightly better');
        expect(spokenArcValue(33)).toBe('slightly better');
        expect(spokenArcValue(34)).toBe('clearly better');
        expect(spokenArcValue(66)).toBe('clearly better');
        expect(spokenArcValue(67)).toBe('much better');
        expect(spokenArcValue(100)).toBe('much better');
    });

    it('says worse below zero', () => {
        expect(spokenArcValue(-1)).toBe('slightly worse');
        expect(spokenArcValue(-34)).toBe('clearly worse');
        expect(spokenArcValue(-100)).toBe('much worse');
    });
});

describe('arc layout and stepping', () => {
    it('maps heights to whole values and back, clamped to the range', () => {
        const layout = createArcsLayout(300, 208, 3);

        expect(layout.valueAt(layout.baselineY)).toBe(0);
        expect(layout.valueAt(layout.valueY(40))).toBe(40);
        expect(layout.valueAt(-500)).toBe(100);
        expect(layout.valueAt(9999)).toBe(-100);
    });

    it('steps by 10, by 1 with Shift, from the baseline when there is no point, within the range', () => {
        expect(stepArcValue(null, 1, false)).toBe(10);
        expect(stepArcValue(null, -1, true)).toBe(-1);
        expect(stepArcValue(95, 1, false)).toBe(100);
        expect(stepArcValue(-100, -1, true)).toBe(-100);
    });
});
