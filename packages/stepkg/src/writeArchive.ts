import {zip, type AsyncZippable} from 'fflate';

import {STEPKG_MEDIA_TYPE} from './constants';
import type {StepkgEntry} from './contracts';

export const writeStepkgArchive = (entries: StepkgEntry[]): Promise<Blob> => {
    const zippable = Object.fromEntries(entries.map(entry => [entry.path, [entry.bytes, {level: entry.compression === 'store' ? 0 : 6}]])) as AsyncZippable;

    return new Promise((resolve, reject) => {
        zip(zippable, (error, data) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(new Blob([data], {type: STEPKG_MEDIA_TYPE}));
        });
    });
};
