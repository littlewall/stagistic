import {drawPdf} from './drawPdf';

self.onmessage = (event: MessageEvent) => {
    if (event.data?.type !== 'START') {
        return;
    }

    void (async () => {
        try {
            const blob = await drawPdf(event.data.transcript, {
                blankPagesBeforeScript: event.data.blankPagesBeforeScript,
            });

            self.postMessage({type: 'DONE', blob});
        } catch (error) {
            self.postMessage({type: 'ERROR', message: String(error)});
        }
    })();
};
