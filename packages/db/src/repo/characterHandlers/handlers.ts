import {createCoreCharacterMutations} from './coreMutations';
import {createGenderMutations} from './genderMutations';
import {createOutlineMutations} from './outlineMutations';
import type {
    CharacterHandlers,
    CreateCharacterHandlersArgs,
} from './types';

export const createCharacterHandlers = ({
    getDb,
    recordOutbox,
    syncDb,
}: CreateCharacterHandlersArgs): CharacterHandlers => {
    const coreMutations = createCoreCharacterMutations({
        getDb,
        recordOutbox,
        syncDb,
    });
    const genderMutations = createGenderMutations({
        getDb,
        recordOutbox,
        syncDb,
    });
    const outlineMutations = createOutlineMutations({
        getDb,
        recordOutbox,
        syncDb,
    });

    return {
        ...genderMutations,
        ...coreMutations,
        ...outlineMutations,
    };
};
