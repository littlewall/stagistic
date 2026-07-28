const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return false;
    }

    const prototype: unknown = Object.getPrototypeOf(value);

    return prototype === Object.prototype || prototype === null;
};

/*
 * A value carries no persisted meaning when it is undefined or an object
 * whose every field is itself structurally absent (e.g. `{typography: {}}`).
 * Database round-trips hydrate such empty sections while in-memory drafts
 * omit them, so equality must not distinguish the two.
 */
export const isStructurallyAbsent = (value: unknown): boolean => value === undefined
    || (isPlainObject(value) && Object.values(value).every(isStructurallyAbsent));

/**
 * Deep structural equality for JSON-like values: insensitive to object key
 * order and to structurally absent members (undefined or recursively empty
 * objects). `null` is a value and never equals `undefined`.
 */
export const structuralValueEquals = (left: unknown, right: unknown): boolean => {
    if (Object.is(left, right)) {
        return true;
    }

    if (isStructurallyAbsent(left) || isStructurallyAbsent(right)) {
        return isStructurallyAbsent(left) && isStructurallyAbsent(right);
    }

    if (Array.isArray(left) || Array.isArray(right)) {
        return Array.isArray(left)
            && Array.isArray(right)
            && left.length === right.length
            && left.every((item, index) => structuralValueEquals(item, right[index]));
    }

    if (isPlainObject(left) && isPlainObject(right)) {
        const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

        return [...keys].every(key => structuralValueEquals(left[key], right[key]));
    }

    return false;
};
