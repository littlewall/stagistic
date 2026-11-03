import type {ArcsLayout} from './arcsGeometry';
import type {BoardArcsArc, BoardArcsScene} from './arcsTypes';
import styles from './BoardArcs.module.css';
import type {useArcsPointer} from './useArcsPointer';

export const ArcsAnchors = ({
    arc,
    scenes,
    layout,
    pointProps,
}: {
    arc: BoardArcsArc,
    scenes: readonly BoardArcsScene[],
    layout: ArcsLayout,
    pointProps: ReturnType<typeof useArcsPointer>['pointProps'],
}) => {
    const indices = [0, scenes.length - 1].filter((index, position, all) => {
        const hasPoint = arc.points.some(point => point.sceneIndex === index);

        return index >= 0 && all.indexOf(index) === position && !hasPoint;
    });

    return (
        <>{indices.map(index => (
            <circle
                key={index}
                cx={layout.sceneX(index)}
                cy={layout.baselineY}
                r={8}
                fill="transparent"
                className={styles.editablePoint}
                aria-hidden="true"
                data-anchor={`${arc.id}:${index}`}
                {...pointProps(arc.id, scenes[index].headingBlockId, index)}
            />
        ))}
        </>
    );
};
