import type {ScriptDocument} from '@stagistic/script';

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
