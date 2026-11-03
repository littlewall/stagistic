import {arcCurveY} from './arcsCurve';
import type {ArcGeometryPoint, ArcsLayout} from './arcsGeometry';
import type {BoardArcsArc, BoardArcsPoint} from './arcsTypes';

export const ArcsPresence = ({
    arc,
    points,
    layout,
    curve,
    opacity,
}: {
    arc: BoardArcsArc,
    points: readonly BoardArcsPoint[],
    layout: ArcsLayout,
    curve: readonly ArcGeometryPoint[],
    opacity: number,
}) => (
    <>{(arc.presence ?? []).filter(index => !points.some(point => point.sceneIndex === index)).map(index => (
        <circle
            key={index}
            cx={layout.sceneX(index)}
            cy={arcCurveY(curve, layout.sceneX(index), layout.baselineY)}
            r={1}
            fill={arc.color}
            opacity={opacity}
            aria-hidden="true"
            pointerEvents="none"
            data-presence={`${arc.id}:${index}`}
        />
    ))}
    </>
);
