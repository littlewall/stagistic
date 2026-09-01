import {useScriptRepository} from '@stagistic/app-core';
import {
    seedActsAndScenesDemoScript,
} from '@stagistic/feature-demos/acts-and-scenes-fixture';
import {runActsAndScenesDemo} from '@stagistic/feature-demos/run-acts-and-scenes-demo';
import {LoaderOverlay} from '@stagistic/ui';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

export const ActsAndScenesDemoRoute = () => {
    const repository = useScriptRepository();
    const navigate = useNavigate();
    const hasStartedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hasStartedRef.current) {
            return;
        }

        hasStartedRef.current = true;

        void runActsAndScenesDemo({
            seedScript: () => seedActsAndScenesDemoScript(repository),
            navigate: path => void navigate(path, {replace: true}),
        }).catch(() => {
            setError('Could not prepare the acts and scenes demo.');
        });
    }, [navigate, repository]);

    if (error) {
        return <p role="alert">{error}</p>;
    }

    return (
        <LoaderOverlay
            label="Preparing editor demo"
            messages={['Setting the structure']}
        />
    );
};
