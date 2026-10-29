import {
    type EditorSettings,
    type EditorSettingsOverride,
    type FormatTemplateId,
    type TitlePageSettings,
} from '@stagistic/script';
import {createContext, useContext} from 'react';

import {type AttributeManagerPanelId} from '../attribute-manager/attributeManagerMenu';
import {type useMusicAttachmentsState} from '../attribute-manager/useMusicAttachmentsState';
import {type useScriptMusicState} from '../editor/music/useScriptMusicState';

export interface ScriptSettingsModalContextValue {
    resolvedScriptSettings: EditorSettings,
    formatTemplateId?: FormatTemplateId | null,
    effectiveScriptSettingsDraft: EditorSettingsOverride,
    isEditorPresentationHydrated: boolean,
    titlePageDraft: TitlePageSettings,
    scriptTitleDraft: string,
    updateScriptTitle: (title: string) => void,
    musicState: ReturnType<typeof useScriptMusicState>,
    musicAttachmentsState: ReturnType<typeof useMusicAttachmentsState>,
    openSettingsModal: (returnFocus?: HTMLElement | null) => void,
    openAttributeManagerModal: (returnFocus?: HTMLElement | null) => void,
    openAttributeManagerModalWithPanel: (panelId: AttributeManagerPanelId, returnFocus?: HTMLElement | null) => void,
    openAttributeManagerCharacter: (characterId: string, returnFocus?: HTMLElement | null) => void,
    openAttributeManagerGroup: (groupId: string, returnFocus?: HTMLElement | null) => void,
    openAttributeManagerMusic: (musicId: string, returnFocus?: HTMLElement | null) => void,
}

export const ScriptSettingsModalContext = createContext<ScriptSettingsModalContextValue | null>(null);

export const useScriptSettingsModal = (): ScriptSettingsModalContextValue => {
    const context = useContext(ScriptSettingsModalContext);

    if (!context) {
        throw new Error('useScriptSettingsModal must be used inside ScriptSettingsModalProvider');
    }

    return context;
};
