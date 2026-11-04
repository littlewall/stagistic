import {arcCurvePoints, arcCurveY} from './arcsCurve';
import type {ArcsLayout} from './arcsGeometry';
import type {BoardArcsArc} from './arcsTypes';

export interface ArcPointTarget {
    characterId: string,
    sceneIndex: number,
    y: number,
    value: number,
}

/** Snap to a visible curve at the scene, never to the pointer's arbitrary height. */
export const nearestArcPoint = (
    arcs: readonly BoardArcsArc[],
    layout: ArcsLayout,
    sceneCount: number,
    sceneIndex: number,
    pointerY: number,
    preferredId: string | null,
): ArcPointTarget | null => {
    let nearest: {
        arc: BoardArcsArc,
        y: number,
        distance: number,
    } | null = null;

    for (const arc of arcs) {
        const curve = arcCurvePoints(arc.points, sceneCount, layout);
        const y = arcCurveY(curve, layout.sceneX(sceneIndex), layout.baselineY);
        const distance = Math.abs(pointerY - y);

        if (!nearest || distance < nearest.distance || (distance === nearest.distance && arc.id === preferredId)) {
            nearest = {
                arc,
                y,
                distance,
            };
        }
    }

    if (!nearest || nearest.arc.points.some(point => point.sceneIndex === sceneIndex)) return null;

    return {
        characterId: nearest.arc.id,
        sceneIndex,
        y: nearest.y,
        value: layout.valueAt(nearest.y),
    };
};
