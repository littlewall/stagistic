import {
    type EditorSettings,
    type EditorSettingsOverride,
    type TitlePageSettings,
} from '@stagistic/script';
import {createContext, useContext} from 'react';

import {type AttributeManagerPanelId} from '../attribute-manager/attributeManagerMenu';
import {type useMusicAttachmentsState} from '../attribute-manager/useMusicAttachmentsState';
import {type useScriptMusicState} from '../editor/music/useScriptMusicState';

export interface ScriptSettingsModalContextValue {
    resolvedScriptSettings: EditorSettings,
    effectiveScriptSettingsDraft: EditorSettingsOverride,
    isEditorPresentationHydrated: boolean,
    titlePageDraft: TitlePageSettings,
    scriptTitleDraft: string,
    updateScriptTitle: (title: string) => void,
    musicState: ReturnType<typeof useScriptMusicState>,
    musicAttachmentsState: ReturnType<typeof useMusicAttachmentsState>,
    openSettingsModal: () => void,
    openAttributeManagerModal: () => void,
    openAttributeManagerModalWithPanel: (panelId: AttributeManagerPanelId) => void,
    openAttributeManagerCharacter: (characterId: string) => void,
    openAttributeManagerGroup: (groupId: string) => void,
    openAttributeManagerMusic: (musicId: string) => void,
}

export const ScriptSettingsModalContext = createContext<ScriptSettingsModalContextValue | null>(null);

export const useScriptSettingsModal = (): ScriptSettingsModalContextValue => {
    const context = useContext(ScriptSettingsModalContext);

    if (!context) {
        throw new Error('useScriptSettingsModal must be used inside ScriptSettingsModalProvider');
    }

    return context;
};
