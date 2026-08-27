import {useScriptRepository} from '@stagistic/app-core';
import {
    seedEditorBlocksDemoScript,
} from '@stagistic/feature-demos/editor-blocks-fixture';
import {runEditorBlocksDemo} from '@stagistic/feature-demos/run-editor-blocks-demo';
import {LoaderOverlay} from '@stagistic/ui';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

export const EditorBlocksDemoRoute = () => {
    const repository = useScriptRepository();
    const navigate = useNavigate();
    const hasStartedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hasStartedRef.current) {
            return;
        }

        hasStartedRef.current = true;

        void runEditorBlocksDemo({
            seedScript: () => seedEditorBlocksDemoScript(repository),
            navigate: path => void navigate(path, {replace: true}),
        }).catch(() => {
            setError('Could not prepare the editor blocks demo.');
        });
    }, [navigate, repository]);

    if (error) {
        return <p role="alert">{error}</p>;
    }

    return (
        <LoaderOverlay
            label="Preparing editor demo"
            messages={['Setting the scene']}
        />
    );
};
