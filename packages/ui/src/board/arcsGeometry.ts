import {ARC_VALUE_LIMIT} from '@stagistic/shared';

export interface ArcGeometryPoint {
    x: number,
    y: number,
}

/** One cubic Bezier segment between two arc points, with its two control points. */
export interface CubicSegment {
    start: ArcGeometryPoint,
    control1: ArcGeometryPoint,
    control2: ArcGeometryPoint,
    end: ArcGeometryPoint,
}

const round = (value: number) => Math.round(value * 100) / 100;

/*
 * Fritsch–Carlson monotone cubic interpolation: a C1 curve through the points whose
 * slope at each point is chosen so the curve stays monotone where the data is monotone.
 * The result never overshoots the neighbouring points, so an arc cannot rise above a
 * local peak or dip below a local trough.
 */
export const monotoneCubicSegments = (points: readonly ArcGeometryPoint[]): CubicSegment[] => {
    if (points.length < 2) return [];

    const count = points.length;
    const segments: CubicSegment[] = [];

    // Secant slopes between consecutive points.
    const secants: number[] = [];

    for (let index = 0; index < count - 1; index++) {
        const dx = points[index + 1].x - points[index].x;

        secants.push(dx === 0 ? 0 : (points[index + 1].y - points[index].y) / dx);
    }

    /*
     * Initial point slopes: the endpoints take their single neighbour, the inside points
     * the average of their two secants (or zero across a local extremum).
     */
    const slopes: number[] = Array.from({length: count}, () => 0);

    slopes[0] = secants[0];
    slopes[count - 1] = secants[count - 2];

    for (let index = 1; index < count - 1; index++) {
        const left = secants[index - 1];
        const right = secants[index];

        slopes[index] = left * right <= 0 ? 0 : (left + right) / 2;
    }

    // Limit each pair so the segment stays monotone: the Fritsch–Carlson circle test.
    for (let index = 0; index < count - 1; index++) {
        const secant = secants[index];

        if (secant === 0) {
            slopes[index] = 0;
            slopes[index + 1] = 0;
            continue;
        }

        const alpha = slopes[index] / secant;
        const beta = slopes[index + 1] / secant;

        if (alpha * alpha + beta * beta > 9) {
            const tau = 3 / Math.sqrt(alpha * alpha + beta * beta);

            slopes[index] = tau * alpha * secant;
            slopes[index + 1] = tau * beta * secant;
        }
    }

    // Turn each Hermite interval into a cubic Bezier segment.
    for (let index = 0; index < count - 1; index++) {
        const start = points[index];
        const end = points[index + 1];
        const dx = (end.x - start.x) / 3;

        segments.push({
            start,
            control1: {x: start.x + dx, y: start.y + slopes[index] * dx},
            control2: {x: end.x - dx, y: end.y - slopes[index + 1] * dx},
            end,
        });
    }

    return segments;
};

/** An SVG `d` path through the points with a monotone cubic smoothing; empty below two points. */
export const buildMonotonePath = (points: readonly ArcGeometryPoint[]): string => {
    const segments = monotoneCubicSegments(points);

    if (segments.length === 0) return '';

    const [first] = segments;

    return `M${round(first.start.x)} ${round(first.start.y)} ${segments.map(segment => `C${round(segment.control1.x)} ${round(segment.control1.y)} ${round(segment.control2.x)} ${round(segment.control2.y)} ${round(segment.end.x)} ${round(segment.end.y)}`).join(' ')}`;
};

/*
 * Which scene indices carry a number on the axis: every one while they fit, otherwise a
 * thinning of evenly spaced numbers. The chosen gap is wide enough that two neighbouring
 * labels never overlap at the given width, with `minLabelWidth` as the tightest label.
 */
export const selectSceneNumbers = (
    count: number,
    availableWidth: number,
    minLabelWidth: number,
): readonly number[] => {
    if (count <= 0 || availableWidth <= 0 || minLabelWidth <= 0) return [];

    const maxLabels = Math.floor(availableWidth / minLabelWidth);

    if (maxLabels >= count) {
        return Array.from({length: count}, (_, index) => index);
    }

    if (maxLabels <= 0) return [];

    const step = Math.ceil(count / maxLabels);
    const indices: number[] = [];

    for (let index = 0; index < count; index += step) indices.push(index);

    return indices;
};

/*
 * The arc value in words for a screen reader, never shown as a number: neutral at the
 * baseline, otherwise the third of the range plus the direction.
 */
export const spokenArcValue = (value: number): string => {
    const magnitude = Math.abs(value);

    if (magnitude === 0) return 'neutral';

    const word = magnitude <= 33 ? 'slightly' : magnitude <= 66 ? 'clearly' : 'much';
    const direction = value > 0 ? 'better' : 'worse';

    return `${word} ${direction}`;
};

/** The radius of an arc point's dot. */
export const POINT_RADIUS = 4;
/** Air kept between a ±100 point and the plot's edge. */
export const PLOT_PADDING = 8;

export const clampArcValue = (value: number): number => Math.max(-ARC_VALUE_LIMIT, Math.min(ARC_VALUE_LIMIT, Math.round(value)));

/** The plot's coordinate system: scenes spread evenly, the baseline at the vertical centre. */
export interface ArcsLayout {
    width: number,
    height: number,
    columnWidth: number,
    baselineY: number,
    sceneX: (index: number) => number,
    valueY: (value: number) => number,
    /** The whole-number value at a plot height, clamped to the range. */
    valueAt: (y: number) => number,
}

export const createArcsLayout = (width: number, height: number, sceneCount: number): ArcsLayout => {
    const columnWidth = sceneCount > 0 ? width / sceneCount : 0;
    const baselineY = height / 2;
    const plotRange = Math.max(0, baselineY - PLOT_PADDING);

    return {
        width,
        height,
        columnWidth,
        baselineY,
        sceneX: index => columnWidth * (index + 0.5),
        valueY: value => baselineY - (value / ARC_VALUE_LIMIT) * plotRange,
        valueAt: y => (plotRange === 0 ? 0 : clampArcValue(((baselineY - y) / plotRange) * ARC_VALUE_LIMIT)),
    };
};

/** A key press moved a point: ±10, or ±1 with Shift; a scene without a point starts at the baseline. */
export const stepArcValue = (value: number | null, direction: 1 | -1, isFine: boolean): number => clampArcValue((value ?? 0) + direction * (isFine ? 1 : 10));
