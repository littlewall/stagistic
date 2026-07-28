import type {TranscriptResult} from '../visualLine';
import {drawPdf} from './drawPdf';

interface StartMessage {
    type: 'START',
    transcript: TranscriptResult,
}

self.onmessage = (event: MessageEvent<StartMessage>) => {
    if (event.data.type !== 'START') {
        return;
    }

    void (async () => {
        try {
            const blob = await drawPdf(event.data.transcript);

            self.postMessage({type: 'DONE', blob});
        } catch (error) {
            self.postMessage({type: 'ERROR', message: String(error)});
        }
    })();
};
