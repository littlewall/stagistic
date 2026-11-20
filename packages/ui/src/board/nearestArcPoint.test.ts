import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {createArcsLayout} from './arcsGeometry';
import type {BoardArcsArc} from './arcsTypes';
import {nearestArcPoint} from './nearestArcPoint';

const layout = createArcsLayout(300, 200, 3);
const arc = (id: string, value: number): BoardArcsArc => ({
    id,
    name: id,
    color: 'red',
    points: [0, 2].map(sceneIndex => ({
        headingBlockId: `s${sceneIndex}`,
        sceneIndex,
        value,
        hasStoredValue: true,
        evidence: true,
        note: null,
    })),
});

describe('nearest curve point', () => {
    it('chooses the closest visible curve and preserves its height rather than the cursor height', () => {
        const arcs = [arc('upper', 60), arc('lower', -40)];
        const target = nearestArcPoint(arcs, layout, 3, 1, layout.valueY(45), 'lower');

        expect(target).toMatchObject({
            characterId: 'upper',
            sceneIndex: 1,
            value: 60,
        });
        expect(target?.y).toBeCloseTo(layout.valueY(60));
        expect(nearestArcPoint(arcs, layout, 3, 1, layout.valueY(-55), 'upper')?.characterId).toBe('lower');
    });
    it('does not replace a point or target a hidden curve', () => {
        expect(nearestArcPoint([arc('a', 60)], layout, 3, 0, 10, null)).toBeNull();
        expect(nearestArcPoint([], layout, 3, 1, 10, null)).toBeNull();
    });
    it('uses the selected character to resolve overlapping curves', () => {
        expect(nearestArcPoint([arc('a', 0), arc('b', 0)], layout, 3, 1, 100, 'b')?.characterId).toBe('b');
    });
});
