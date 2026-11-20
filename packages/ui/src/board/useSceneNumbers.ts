import type {RefObject} from 'react';
import {
    useLayoutEffect,
    useMemo,
    useState,
} from 'react';

import {selectSceneNumbers} from './arcsGeometry';
import type {BoardArcsScene} from './arcsTypes';

/** Air kept between two neighbouring labels. */
const LABEL_GAP = 8;
/** The pitch assumed until the labels have been measured. */
const FALLBACK_LABEL_WIDTH = 24;

/* The widest of the labels in the container's own font. */
const measureWidest = (container: HTMLElement, labels: readonly string[]): number => {
    const context = document.createElement('canvas').getContext('2d');

    if (!context) return FALLBACK_LABEL_WIDTH;

    const style = getComputedStyle(container);

    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

    return Math.ceil(labels.reduce((widest, label) => Math.max(widest, context.measureText(label).width), 0));
};

/*
 * Which scenes carry a number on the axis. The pitch comes from the widest formatted label
 * (measured in the axis font), so long numbers thin out sooner than short ones.
 */
export const useSceneNumbers = (
    axisRef: RefObject<HTMLElement | null>,
    scenes: readonly BoardArcsScene[],
    width: number,
    hasAxis: boolean,
): readonly number[] => {
    const [widest, setWidest] = useState(FALLBACK_LABEL_WIDTH);
    const labelKey = scenes.map(scene => scene.number).join('\n');

    useLayoutEffect(() => {
        if (hasAxis && axisRef.current) setWidest(measureWidest(axisRef.current, labelKey.split('\n')));
    }, [
        axisRef,
        hasAxis,
        labelKey,
    ]);

    return useMemo(
        () => selectSceneNumbers(scenes.length, width, widest + LABEL_GAP),
        [
            scenes.length,
            width,
            widest,
        ],
    );
};
