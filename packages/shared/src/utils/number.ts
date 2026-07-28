export const clampNumber = (value: number, min: number, max: number) => {
    const lowerBound = Math.min(min, max);
    const upperBound = Math.max(min, max);

    return Math.min(upperBound, Math.max(lowerBound, value));
};
