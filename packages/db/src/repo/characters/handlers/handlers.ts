import {createCoreCharacterMutations} from './coreMutations';
import {createGenderMutations} from './genderMutations';
import {createOutlineMutations} from './outlineMutations';
import type {
    CharacterHandlers,
    CreateCharacterHandlersArgs,
} from './types';
import {createVocalRangeMutations} from './vocalRangeMutations';

export const createCharacterHandlers = ({
    getDb,
    syncDb,
}: CreateCharacterHandlersArgs): CharacterHandlers => {
    const coreMutations = createCoreCharacterMutations({
        getDb,
        syncDb,
    });
    const genderMutations = createGenderMutations({
        getDb,
        syncDb,
    });
    const outlineMutations = createOutlineMutations({
        getDb,
        syncDb,
    });
    const vocalRangeMutations = createVocalRangeMutations({
        getDb,
        syncDb,
    });

    return {
        ...genderMutations,
        ...coreMutations,
        ...outlineMutations,
        ...vocalRangeMutations,
    };
};
