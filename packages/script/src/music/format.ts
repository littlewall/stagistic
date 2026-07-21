import type {DerivedMusic} from './types';

type MusicNumberInput = Pick<DerivedMusic, 'sceneNumber' | 'indexInScene' | 'sceneMusicCount'>;
type MusicOutLabelInput = MusicNumberInput & Pick<DerivedMusic, 'title'>;

/** Spreadsheet-style letters: 0→A … 25→Z, 26→AA, 27→AB, … */
export const musicLetter = (index: number): string => {
    let result = '';
    let n = index;

    do {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);

    return result;
};

export const formatMusicNumber = (music: MusicNumberInput): string => {
    if (music.sceneMusicCount <= 1) {
        return `${music.sceneNumber})`;
    }

    return `${music.sceneNumber}.${musicLetter(music.indexInScene)})`;
};

export const formatMusicOutLabel = (music: MusicOutLabelInput): string => {
    const number = formatMusicNumber(music);
    const title = music.title.trim();

    return title.length > 0 ? `${number} out (${title})` : `${number} out`;
};
