import {useScripts} from '@stagistic/app-core';
import {Navigate, useParams} from 'react-router-dom';

import {SETTINGS_MODAL_QUERY_KEY} from './settings/settingsMenu';

export const ScriptSettingsRoute = () => {
    const {scriptId} = useParams();
    const {scripts, isLoading} = useScripts();

    if (isLoading) {
        return null;
    }

    const targetScriptId = scriptId ?? scripts[0]?.id;

    if (!targetScriptId) {
        return (
            <Navigate to="/" replace />
        );
    }

    return (
        <Navigate to={`/script/${targetScriptId}/editor?${SETTINGS_MODAL_QUERY_KEY}=1`} replace />
    );
};

