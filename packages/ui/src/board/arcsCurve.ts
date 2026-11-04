import {
    type ArcGeometryPoint,
    type ArcsLayout,
    monotoneCubicSegments,
} from './arcsGeometry';
import type {BoardArcsPoint} from './arcsTypes';

/** Implicit baseline endpoints are geometry only; they never become stored points. */
export const arcCurvePoints = (points: readonly BoardArcsPoint[], sceneCount: number, layout: ArcsLayout): ArcGeometryPoint[] => {
    if (sceneCount === 0) return [];

    const values = new Map(points.map(point => [point.sceneIndex, point.value]));

    if (!values.has(0)) values.set(0, 0);

    if (!values.has(sceneCount - 1)) values.set(sceneCount - 1, 0);

    return [...values].toSorted(([left], [right]) => left - right).map(([index, value]) => ({x: layout.sceneX(index), y: layout.valueY(value)}));
};

/** Evaluate the same cubic used by the path, so presence dots sit exactly on it. */
export const arcCurveY = (points: readonly ArcGeometryPoint[], x: number, fallback: number): number => {
    const segment = monotoneCubicSegments(points).find(item => x >= item.start.x && x <= item.end.x);

    if (!segment) return points[0]?.y ?? fallback;

    const t = (x - segment.start.x) / (segment.end.x - segment.start.x);
    const rest = 1 - t;

    return rest ** 3 * segment.start.y + 3 * rest ** 2 * t * segment.control1.y + 3 * rest * t ** 2 * segment.control2.y + t ** 3 * segment.end.y;
};
