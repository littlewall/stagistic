import {useScripts} from '@stagistic/app-core';
import {Navigate, useParams} from 'react-router-dom';

const SETTINGS_MODAL_QUERY = 'settingsModal=1';

export const ScriptSettingsRoute = () => {
    const {scriptId} = useParams();
    const {scripts, isLoading} = useScripts();

    if (isLoading) {
        return null;
    }

    const targetScriptId = scriptId ?? scripts[0]?.id;

    if (!targetScriptId) {
        return <Navigate to="/" replace />;
    }

    return (
        <Navigate to={`/script/${targetScriptId}/editor?${SETTINGS_MODAL_QUERY}`} replace />
    );
};

