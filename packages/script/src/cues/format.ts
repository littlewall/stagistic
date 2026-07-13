import type {DerivedCue} from './types';

type CueNumberInput = Pick<DerivedCue, 'sceneNumber' | 'indexInScene' | 'sceneCueCount'>;
type OutLabelInput = CueNumberInput & Pick<DerivedCue, 'title'>;

/** Spreadsheet-style letters: 0→A … 25→Z, 26→AA, 27→AB, … */
export const cueLetter = (index: number): string => {
    let result = '';
    let n = index;

    do {
        result = String.fromCharCode(65 + (n % 26)) + result;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);

    return result;
};

export const formatCueNumber = (cue: CueNumberInput): string => {
    if (cue.sceneCueCount <= 1) {
        return `${cue.sceneNumber})`;
    }

    return `${cue.sceneNumber}.${cueLetter(cue.indexInScene)})`;
};

export const formatOutLabel = (cue: OutLabelInput): string => {
    const number = formatCueNumber(cue);
    const title = cue.title.trim();

    return title.length > 0 ? `${number} out (${title})` : `${number} out`;
};
