import type {ScriptSummary} from '@stagistic/db';

import type {ScriptListItem} from './types';

export const toScriptListItem = (summary: Pick<ScriptSummary, 'id' | 'title'>): ScriptListItem => {
    return {
        id: summary.id,
        name: summary.title,
    };
};
