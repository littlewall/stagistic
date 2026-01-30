import {serializeFountain} from '@stagistic/editor-core';
import type {SlateValue} from '@stagistic/shared';
import {
    AppHeader, AppLayout, EditorSidebar, FountainEditor,
} from '@stagistic/ui';
import {
    useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import {
    latestScriptStorage,
    serializeSlateValue,
} from '../../storage/latestScriptStorage';

const mockProjects = [
    {id: '1', name: 'The Last Light'},
    {id: '2', name: 'Midnight Express'},
    {id: '3', name: 'Summer Solstice'},
    {id: '4', name: 'Winter\'s Tale'},
];

export const EditorRoute = () => {
    const [initialValue, setInitialValue] = useState<SlateValue | null | undefined>(undefined);
    const [serializedPreview, setSerializedPreview] = useState<string>('');
    const latestValueRef = useRef<SlateValue | null>(null);
    const lastSavedSerializedRef = useRef<string | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);
    const [currentProject, setCurrentProject] = useState(mockProjects[0]);

    const recentProjects = useMemo(
        () => mockProjects.filter(project => project.id !== currentProject.id).slice(0, 3),
        [currentProject],
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
                setSerializedPreview(serializeFountain(stored));
                setInitialValue(stored);
            } else {
                setInitialValue(null);
                setSerializedPreview('');
            }
        };

        void loadLatest();
    }, []);

    useEffect(() => {
        return () => {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }
        };
    }, []);

    const saveLatest = useCallback(async (value: SlateValue) => {
        const serialized = serializeSlateValue(value);

        if (serialized === lastSavedSerializedRef.current) return;

        await latestScriptStorage.saveLatestScript(value);
        lastSavedSerializedRef.current = serialized;
    }, []);

    const scheduleAutosave = useCallback(
        (value: SlateValue) => {
            const serialized = serializeSlateValue(value);

            if (serialized === lastSavedSerializedRef.current) return;

            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }

            autosaveTimerRef.current = window.setTimeout(() => {
                const latestValue = latestValueRef.current;

                if (!latestValue) return;

                void saveLatest(latestValue);
            }, 1500);
        },
        [saveLatest],
    );

    const handleValueChange = useCallback(
        (value: SlateValue) => {
            latestValueRef.current = value;
            scheduleAutosave(value);
            setSerializedPreview(serializeFountain(value));
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

    return (
        <AppLayout
            header={(
                <AppHeader
                    currentProject={currentProject}
                    recentProjects={recentProjects}
                    onSelectProject={setCurrentProject}
                />
            )}
            sidebar={<EditorSidebar scenes={scenes} onSceneClick={() => {}} />}
        >
            <FountainEditor
                initialValue={initialValue ?? undefined}
                onValueChange={handleValueChange}
                onManualSave={handleManualSave}
            />
        </AppLayout>
    );
};
