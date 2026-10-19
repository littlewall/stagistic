/** Check an invariant while preserving the value's non-nullable type. */
export const requireValue = <T>(value: T, message = 'Expected a value'): NonNullable<T> => {
    if (value === null || value === undefined) {
        throw new Error(message);
    }

    return value;
};
