import {type ScriptDocument} from '@stagistic/script';

export const addPendingValue = (values: string[], value: string) => {
    if (values.includes(value)) {
        return values;
    }

    return [...values, value];
};

export const removePendingValue = (values: string[], value: string) => {
    return values.filter(current => current !== value);
};

export const getSourceDocument = (
    editorValue: ScriptDocument | null,
    initialValue: ScriptDocument | null | undefined,
) => {
    return editorValue ?? initialValue;
};
