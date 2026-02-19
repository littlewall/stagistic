import type {ScriptListItem} from '@stagistic/app-core';
import type {ToastContent} from '@stagistic/ui';

export interface CurrentScriptItem extends ScriptListItem {}

export type AppToastPayload = Required<Pick<ToastContent, 'title' | 'variant'>>
    & Pick<ToastContent, 'description'>;
