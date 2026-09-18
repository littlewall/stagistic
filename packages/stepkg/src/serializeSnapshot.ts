import {serializeStagistic} from '@stagistic/script';

import {STEPKG_DOCUMENT_PATH, STEPKG_TEXT_PATH} from './constants';
import type {StepkgEntry, StepkgSnapshot} from './contracts';
import {stableJsonBytes} from './stableJson';

const jsonEntry = (path: string, value: unknown): StepkgEntry => ({
    path,
    mediaType: 'application/json',
    bytes: stableJsonBytes(value),
    compression: 'deflate',
});

const textEntry = (path: string, content: string): StepkgEntry => ({
    path,
    mediaType: 'text/plain;charset=utf-8',
    bytes: new TextEncoder().encode(content),
    compression: 'deflate',
});

export const serializeStepkgContent = (snapshot: StepkgSnapshot): StepkgEntry[] => [
    jsonEntry(STEPKG_DOCUMENT_PATH, snapshot.document),
    textEntry(
        STEPKG_TEXT_PATH,
        serializeStagistic(snapshot.document, {
            scriptTitle: snapshot.script.title,
            titlePage: snapshot.titlePage,
        }),
    ),
    jsonEntry('data/script.json', snapshot.script),
    jsonEntry('data/title-page.json', snapshot.titlePage),
    jsonEntry('data/settings.json', snapshot.settings),
    jsonEntry('data/characters.json', snapshot.characters),
    jsonEntry('data/music.json', snapshot.music),
    jsonEntry('data/scenes.json', snapshot.scenes),
];
