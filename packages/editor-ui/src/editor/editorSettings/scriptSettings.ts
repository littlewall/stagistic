import type {EditorSettingsOverride, ScriptDocument} from '@stagistic/script-core';

export const stripScriptSettings = (value: ScriptDocument): ScriptDocument => {
    if (!value.attrs || !('settings' in value.attrs)) {
        return value;
    }

    const restAttrs = {
        ...value.attrs,
    };

    delete restAttrs.settings;

    const hasOtherAttrs = Object.keys(restAttrs).length > 0;

    if (!hasOtherAttrs) {
        return {
            type: value.type,
            content: value.content,
        };
    }

    return {
        type: value.type,
        content: value.content,
        attrs: restAttrs,
    };
};

export const applyScriptSettings = (
    value: ScriptDocument,
    settings?: EditorSettingsOverride,
): ScriptDocument => {
    if (!settings) {
        return value;
    }

    return {
        ...value,
        attrs: {
            ...value.attrs,
            settings,
        },
    };
};
