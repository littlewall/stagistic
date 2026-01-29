import { useCallback, useEffect, useRef, useState } from 'react';
import { FountainEditor } from '@stagistic/editor-ui';
import type { SlateValue } from '@stagistic/shared';
import {
  latestScriptStorage,
  serializeSlateValue,
} from '../../storage/latestScriptStorage';

export const EditorRoute = () => {
    const [initialValue, setInitialValue] = useState<SlateValue | null | undefined>(undefined);
    const latestValueRef = useRef<SlateValue | null>(null);
    const lastSavedSerializedRef = useRef<string | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);

    useEffect(() => {
        const loadLatest = async () => {
            const stored = await latestScriptStorage.loadLatestScript();
            if (stored) {
                latestValueRef.current = stored;
                lastSavedSerializedRef.current = serializeSlateValue(stored);
                setInitialValue(stored);
            } else {
                setInitialValue(null);
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
        [saveLatest]
    );

    const handleValueChange = useCallback(
        (value: SlateValue) => {
            latestValueRef.current = value;
            scheduleAutosave(value);
        },
        [scheduleAutosave]
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
        <FountainEditor
            initialValue={initialValue ?? undefined}
            onValueChange={handleValueChange}
            onManualSave={handleManualSave}
        />
    );
};
