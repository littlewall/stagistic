import {type FountainDocument, serializeFountain} from '@stagistic/editor-core';
import type {SlateValue} from '@stagistic/shared';
import {
    AppHeader,
    AppLayout,
    EditorSidebar,
    FountainEditor,
} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    useNavigate,
    useParams,
} from 'react-router-dom';

import {NewScriptModal} from '~components/NewScriptModal';
import {useScripts} from '~hooks/useScripts';
import {
    latestScriptStorage,
    serializeSlateValue,
} from '~storage/latestScriptStorage';

const AUTOSAVE_DELAY_MS = 1500;

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const {scripts, createScript} = useScripts();
    const [initialValue, setInitialValue] = useState<SlateValue | null | undefined>(undefined);
    const [serializedPreview, setSerializedPreview] = useState<string>('');
    const latestValueRef = useRef<SlateValue | null>(null);
    const lastSavedSerializedRef = useRef<string | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);

    const currentScript = useMemo(
        () => scripts.find(script => script.id === scriptId) ?? scripts[0],
        [scripts, scriptId],
    );

    const recentScripts = useMemo(
        () => currentScript
            ? scripts.filter(script => script.id !== currentScript.id).slice(0, 3)
            : [],
        [scripts, currentScript],
    );

    const scenes = useMemo(() => {
        const lines = serializedPreview.split('\n');
        const scenePattern = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)\s+.+/i;

        return lines
            .map((line, index) => ({line: line.trim(), lineNumber: index}))
            .filter(({line}) => scenePattern.test(line))
            .map(({line, lineNumber}, index) => ({
                id: `scene-${index}`,
                heading: line,
                lineNumber,
            }));
    }, [serializedPreview]);

    useEffect(() => {
        const loadLatest = async () => {
            const stored = await latestScriptStorage.loadLatestScript();

            if (stored) {
                latestValueRef.current = stored;
                lastSavedSerializedRef.current = serializeSlateValue(stored);
                setSerializedPreview(serializeFountain(stored as unknown as FountainDocument));
                setInitialValue(stored);

                return;
            }

            setInitialValue(null);
            setSerializedPreview('');
        };

        void loadLatest();
    }, []);

    useEffect(() => {
        if (!scriptId || scripts.length === 0) {
            return;
        }

        const exists = scripts.some(script => script.id === scriptId);

        if (!exists && scripts[0]) {
            void navigate(`/script/${scripts[0].id}/editor`, {replace: true});
        }
    }, [
        scriptId,
        scripts,
        navigate,
    ]);

    useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }
        };
    }, []);

    const saveLatest = useCallback(async (value: SlateValue) => {
        const serialized = serializeSlateValue(value);

        if (serialized === lastSavedSerializedRef.current) {
            return;
        }

        await latestScriptStorage.saveLatestScript(value);
        lastSavedSerializedRef.current = serialized;
    }, []);

    const scheduleAutosave = useCallback(
        (value: SlateValue) => {
            const serialized = serializeSlateValue(value);

            if (serialized === lastSavedSerializedRef.current) {
                return;
            }

            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }

            autosaveTimerRef.current = window.setTimeout(() => {
                const latestValue = latestValueRef.current;

                if (!latestValue) {
                    return;
                }

                void saveLatest(latestValue);
            }, AUTOSAVE_DELAY_MS);
        },
        [saveLatest],
    );

    const handleValueChange = useCallback(
        (value: SlateValue) => {
            latestValueRef.current = value;
            scheduleAutosave(value);
            setSerializedPreview(serializeFountain(value as unknown as FountainDocument));
        },
        [scheduleAutosave],
    );

    const handleManualSave = useCallback(async (value: SlateValue) => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }

        await saveLatest(value);
    }, [saveLatest]);

    if (initialValue === undefined) {
        return null;
    }

    if (!currentScript) {
        return null;
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    currentScript={currentScript}
                    recentScripts={recentScripts}
                    onSelectScript={script => navigate(`/script/${script.id}/editor`)}
                    onHome={() => navigate('/')}
                    onMenuAction={actionId => {
                        if (actionId === 'scripts') {
                            void navigate('/script/list');

                            return;
                        }

                        if (actionId === 'settings') {
                            void navigate(`/script/${currentScript.id}/settings`);

                            return;
                        }

                        if (actionId === 'new-script') {
                            setIsModalOpen(true);
                        }
                    }}
                />
            )}
            sidebar={<EditorSidebar scenes={scenes} onSceneClick={() => {}} />}
        >
            <FountainEditor
                initialValue={initialValue ?? undefined}
                onValueChange={handleValueChange}
                onManualSave={handleManualSave}
            />
            <NewScriptModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={name => {
                    const script = createScript(name);

                    setIsModalOpen(false);
                    void navigate(`/script/${script.id}/editor`);
                }}
            />
        </AppLayout>
    );
};
