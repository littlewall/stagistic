/** An arc point's value runs from -ARC_VALUE_LIMIT (much worse) to ARC_VALUE_LIMIT (much better). */
export const ARC_VALUE_LIMIT = 100;

export const isArcValue = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && Math.abs(value) <= ARC_VALUE_LIMIT;

export const ARC_VALUE_RANGE_MESSAGE = `Arc value must be an integer from -${ARC_VALUE_LIMIT} to ${ARC_VALUE_LIMIT}.`;
