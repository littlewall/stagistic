import {
    createActlessScriptDocument,
    createDefaultScriptDocument,
    type ScriptDocument,
} from '@stagistic/script';
import type {NewScriptShape} from '@stagistic/ui';

const documentFactories: Record<NewScriptShape, () => ScriptDocument> = {
    'multi-act': createDefaultScriptDocument,
    'one-act': createActlessScriptDocument,
};

export const createInitialScriptDocument = (shape: NewScriptShape): ScriptDocument => {
    return documentFactories[shape]();
};
