import {ELEMENT_CHARACTER} from '@stagistic/script';

import {type FountainBlockType} from '../../fountainCore';

export const isCharacterBlockType = (value: FountainBlockType) => {
    return value === ELEMENT_CHARACTER;
};

export type CharacterBlockRange = {
    from: number,
    to: number,
    text: string,
};

export type CharacterCleanupEdit = {
    from: number,
    to: number,
    cleaned: string,
};
