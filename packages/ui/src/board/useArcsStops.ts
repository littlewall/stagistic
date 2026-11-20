import type {KeyboardEvent, RefObject} from 'react';
import {useState} from 'react';

import {stepArcValue} from './arcsGeometry';
import type {BoardArcsArc} from './arcsTypes';

/*
 * The active character's scenes as one roving tab stop: left/right move across every scene,
 * up/down move the point by 10 (1 with Shift) and a scene without one starts at the baseline,
 * Enter or Space opens the popover (on a scene without a point it first creates one at the
 * baseline), Delete or Backspace removes a stored point (a note's baseline point has nothing to remove). Escape is handled by the chart as a whole.
 */
export const useArcsStops = ({
    plotRef,
    sceneCount,
    arc,
    headingBlockIds,
    onSetPoint,
    onRemovePoint,
    onOpenPoint,
}: {
    plotRef: RefObject<HTMLElement | null>,
    sceneCount: number,
    arc: BoardArcsArc | undefined,
    headingBlockIds: readonly string[],
    onSetPoint?: (headingBlockId: string, characterId: string, value: number) => void,
    onRemovePoint?: (headingBlockId: string, characterId: string) => void,
    onOpenPoint: (characterId: string, sceneIndex: number) => void,
}) => {
    const [focusScene, setFocusScene] = useState(0);
    /* A shorter script can leave the stop past the last scene. */
    const stop = Math.max(0, Math.min(focusScene, sceneCount - 1));

    const focusStop = (index: number) => {
        plotRef.current?.querySelector<SVGElement>(`[data-stop="${index}"]`)?.focus();
    };

    const onKeyDown = (event: KeyboardEvent<SVGElement>, index: number) => {
        if (!arc) return;

        const headingBlockId = headingBlockIds[index];
        const point = arc.points.find(item => item.sceneIndex === index);

        switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowRight': {
                event.preventDefault();
                focusStop(Math.max(0, Math.min(sceneCount - 1, index + (event.key === 'ArrowRight' ? 1 : -1))));
                break;
            }
            case 'ArrowUp':
            case 'ArrowDown': {
                event.preventDefault();
                onSetPoint?.(headingBlockId, arc.id, stepArcValue(point?.value ?? null, event.key === 'ArrowUp' ? 1 : -1, event.shiftKey));
                break;
            }
            case 'Enter':
            case ' ': {
                event.preventDefault();

                if (!point) onSetPoint?.(headingBlockId, arc.id, 0);

                onOpenPoint(arc.id, index);
                break;
            }
            case 'Delete':
            case 'Backspace': {
                if (point?.hasStoredValue) {
                    event.preventDefault();
                    onRemovePoint?.(headingBlockId, arc.id);
                }

                break;
            }
            default:
        }
    };

    const stopProps = (index: number) => ({
        tabIndex: index === stop ? 0 : -1,
        'data-stop': index,
        onFocus: () => setFocusScene(index),
        onKeyDown: (event: KeyboardEvent<SVGElement>) => onKeyDown(event, index),
    });

    return {stopProps, focusStop};
};
