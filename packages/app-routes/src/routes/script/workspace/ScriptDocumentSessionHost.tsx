import {ScriptDocumentRuntime} from '@stagistic/editor';
import {LoaderOverlay} from '@stagistic/ui';
import {type ReactNode, useSyncExternalStore} from 'react';

import {useScriptSettingsModal} from '../settings/ScriptSettingsModalContext';
import {useScriptReadOnlyState} from './ScriptAccessContext';
import {useScriptCharacters} from './ScriptCharactersContext';
import {useScriptWorkspace} from './ScriptWorkspaceContext';

export const ScriptDocumentSessionHost = ({children}: {children: ReactNode}) => {
    const {
        documentSession,
        initialValue,
        handleAutoSave,
        handleManualSave,
        handleSummaryMetadataChange,
    } = useScriptWorkspace();
    const {isReadOnly} = useScriptReadOnlyState();
    const {normalizedSpeakingEntityRecords} = useScriptCharacters();
    const {
        effectiveScriptSettingsDraft,
        isEditorPresentationHydrated,
        musicState,
    } = useScriptSettingsModal();
    const isReady = useSyncExternalStore(documentSession.subscribe, () => documentSession.getSnapshot().isReady, () => false);

    if (!initialValue || !isEditorPresentationHydrated) {
        return <LoaderOverlay label="Preparing editor" messages={['Loading editor settings']} />;
    }

    return (
        <>
            <ScriptDocumentRuntime
                session={documentSession}
                isReadOnly={isReadOnly}
                document={{
                    initialValue,
                    persistentCharacters: normalizedSpeakingEntityRecords,
                    persistentMusic: musicState.music,
                }}
                settings={{scriptSettings: effectiveScriptSettingsDraft}}
                save={{
                    onAutoSave: handleAutoSave,
                    onManualSave: handleManualSave,
                    onSummaryMetadataChange: handleSummaryMetadataChange,
                }}
            />
            {isReady ? children : <LoaderOverlay label="Preparing editor" messages={['Loading script']} />}
        </>
    );
};
