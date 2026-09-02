import {useScriptRepository} from '@stagistic/app-core';
import {seedCharactersDemoScript} from '@stagistic/feature-demos/characters-fixture';
import {runCharactersDemo} from '@stagistic/feature-demos/run-characters-demo';
import {LoaderOverlay} from '@stagistic/ui';
import {
    useEffect,
    useRef,
    useState,
} from 'react';
import {useNavigate} from 'react-router-dom';

export const CharactersDemoRoute = () => {
    const repository = useScriptRepository();
    const navigate = useNavigate();
    const hasStartedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (hasStartedRef.current) {
            return;
        }

        hasStartedRef.current = true;

        void runCharactersDemo({
            seedScript: () => seedCharactersDemoScript(repository),
            navigate: path => void navigate(path, {replace: true}),
        }).catch(() => {
            setError('Could not prepare the characters demo.');
        });
    }, [navigate, repository]);

    if (error) {
        return <p role="alert">{error}</p>;
    }

    return (
        <LoaderOverlay
            label="Preparing editor demo"
            messages={['Setting the cast']}
        />
    );
};
