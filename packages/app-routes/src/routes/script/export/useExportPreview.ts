import {
    type ExportPlan,
    renderPdfInWorker,
    type ScriptData,
    transcribeExportPlan,
} from '@stagistic/export';
import {
    useEffect,
    useRef,
} from 'react';

import {useExportContext} from './ExportProvider';

const EXPORT_DEBOUNCE_MS = 300;

interface UseExportPreviewArgs<TConfig> {
    config: TConfig,
    derive: (config: TConfig, script: ScriptData) => ExportPlan,
    onArtifact?: (artifact: Blob) => void,
}

export const useExportPreview = <TConfig >({
    config,
    derive,
    onArtifact,
}: UseExportPreviewArgs<TConfig>) => {
    const {
        script,
        settings,
        musicAttachments,
        canExport,
        setArtifact,
        setStatus,
    } = useExportContext();
    const runRef = useRef(0);

    useEffect(() => {
        if (!canExport) {
            runRef.current += 1;
            setArtifact(null);
            setStatus('idle');

            return;
        }

        const runId = runRef.current + 1;
        const controller = new AbortController();

        runRef.current = runId;
        setStatus('regenerating');

        const timer = window.setTimeout(() => {
            const run = async () => {
                try {
                    const plan = derive(config, script);
                    const transcript = transcribeExportPlan(plan, settings);
                    const scorePdfs = await Promise.all(plan.postSteps.map(async step => {
                        const attachment = musicAttachments?.integratedScoresByMusic.get(step.musicId);

                        if (!attachment) {
                            return null;
                        }

                        const blob = await musicAttachments?.getBlob(attachment.storageKey);

                        return blob ? [step.musicId, await blob.arrayBuffer()] as const : null;
                    }));

                    transcript.scorePdfs = Object.fromEntries(scorePdfs.filter((item): item is readonly [string, ArrayBuffer] => item !== null));

                    if (controller.signal.aborted || runRef.current !== runId) {
                        return;
                    }

                    const blob = await renderPdfInWorker(transcript, controller.signal);

                    if (controller.signal.aborted || runRef.current !== runId) {
                        return;
                    }

                    setArtifact(blob);
                    setStatus('idle');
                    onArtifact?.(blob);
                } catch (error) {
                    if (controller.signal.aborted || runRef.current !== runId) {
                        return;
                    }

                    setStatus('error');
                }
            };

            void run();
        }, EXPORT_DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [
        config,
        canExport,
        derive,
        onArtifact,
        script,
        settings,
        musicAttachments,
        setArtifact,
        setStatus,
    ]);
};
