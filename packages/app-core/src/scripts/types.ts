import type {ScriptSummary} from '@stagistic/db';

export interface ScriptListItem {
    id: string,
    name: string,
}

export interface ScriptSummaryState {
    script: ScriptListItem | null,
    summary: ScriptSummary | null,
    isLoading: boolean,
    error: Error | null,
}

export interface RecentScriptsState {
    scripts: ScriptListItem[],
    scriptSummaries: ScriptSummary[],
    isLoading: boolean,
    error: Error | null,
}
