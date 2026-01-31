import type {Script} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useState,
} from 'react';

import {
    createScript as createStoredScript,
    loadScripts,
    saveScripts,
} from '~storage/scriptsStorage';

export const useScripts = () => {
    const [scripts, setScripts] = useState<Script[]>([]);

    useEffect(() => {
        setScripts(loadScripts());
    }, []);

    const createScript = useCallback((name: string) => {
        const script = createStoredScript(name);

        setScripts(loadScripts());

        return script;
    }, []);

    const updateScripts = useCallback((next: Script[]) => {
        saveScripts(next);
        setScripts(next);
    }, []);

    return {
        scripts,
        createScript,
        updateScripts,
    };
};
