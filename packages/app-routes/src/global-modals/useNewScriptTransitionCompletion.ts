import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

interface UseNewScriptTransitionCompletionArgs {
    targetPath: string | null,
    onComplete: () => void,
}

export const useNewScriptTransitionCompletion = ({
    targetPath,
    onComplete,
}: UseNewScriptTransitionCompletionArgs) => {
    const {pathname} = useLocation();

    useEffect(() => {
        if (!targetPath || pathname !== targetPath) {
            return;
        }

        onComplete();
    }, [
        onComplete,
        pathname,
        targetPath,
    ]);
};
