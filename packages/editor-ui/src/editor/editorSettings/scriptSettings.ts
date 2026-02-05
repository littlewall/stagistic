import type {EditorSettingsOverride, ScriptDocument} from '@stagistic/shared';

export const stripScriptSettings = (value: ScriptDocument): ScriptDocument => {
    if (!value.attrs || !('settings' in value.attrs)) {
        return value;
    }

    const {settings, ...restAttrs} = value.attrs ?? {};

    // If no settings exist, return the original value to avoid creating new objects
    if (!settings || Object.keys(settings).length === 0) {
        const hasOtherAttrs = Object.keys(restAttrs).length > 0;

        if (!hasOtherAttrs) {
            // Only type and content, no attrs needed
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
    }

    return value;
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
