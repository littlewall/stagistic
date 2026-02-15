import {clampNumber} from '@stagistic/script-core';

export const formatNumeric = (value: number) => {
    if (Number.isInteger(value)) {
        return value.toString();
    }

    return value
        .toFixed(2)
        .replace(/\.?0+$/, '');
};

export const formatLines = (value: number) => {
    const label = formatNumeric(value);

    return `${label} line${value === 1 ? '' : 's'}`;
};

export const formatInches = (value: number) => `${value.toFixed(2)}"`;

export const clamp = (value: number, min: number, max: number) => clampNumber(value, min, max);

const getClosestStepIndex = (steps: readonly number[], value: number) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    steps.forEach((step, index) => {
        const distance = Math.abs(step - value);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });

    return bestIndex;
};

export const getClosestStepValue = (steps: readonly number[], value: number) => {
    const closestIndex = getClosestStepIndex(steps, value);

    return steps[closestIndex] ?? steps[0] ?? value;
};
