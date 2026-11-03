import {
    describe,
    expect,
    it,
} from 'vite-plus/test';

import {arcCurvePoints, arcCurveY} from './arcsCurve';
import {createArcsLayout} from './arcsGeometry';

const layout = createArcsLayout(300, 200, 3);

describe('whole-play curve', () => {
    it('spans the play at zero without stored points', () => {
        expect(arcCurvePoints([], 3, layout)).toEqual([{x: 50, y: 100}, {x: 250, y: 100}]);
    });
    it('replaces an endpoint anchor and interpolates presence on the curve', () => {
        const points = arcCurvePoints([
            {
                headingBlockId: 's0',
                sceneIndex: 0,
                value: 50,
                evidence: true,
                onCard: false,
                note: null,
            },
        ], 3, layout);

        expect(points).toEqual([{x: 50, y: layout.valueY(50)}, {x: 250, y: 100}]);
        expect(arcCurveY(points, 150, 100)).toBeCloseTo((layout.valueY(50) + 100) / 2);
        expect(arcCurvePoints([], 1, layout)).toHaveLength(1);
        expect(arcCurvePoints([], 0, layout)).toEqual([]);
    });
});
