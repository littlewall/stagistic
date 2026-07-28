import {useMemo} from 'react';

import {useScriptsContext} from './ScriptRepositoryProvider';

export const useScriptActions = () => {
    const {scriptsStore} = useScriptsContext();

    return useMemo(() => ({
        createScript: scriptsStore.createScript,
        renameScript: scriptsStore.renameScript,
        renameScriptTitle: scriptsStore.renameScriptTitle,
        duplicateScript: scriptsStore.duplicateScript,
        deleteScript: scriptsStore.deleteScript,
        setActiveBlock: scriptsStore.setActiveBlock,
    }), [scriptsStore]);
};
