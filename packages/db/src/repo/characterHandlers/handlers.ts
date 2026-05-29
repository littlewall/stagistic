import {createCoreCharacterMutations} from './coreMutations';
import {createGenderMutations} from './genderMutations';
import type {
    CharacterHandlers,
    CreateCharacterHandlersArgs,
} from './types';

export const createCharacterHandlers = ({
    getDb,
    recordOutbox,
}: CreateCharacterHandlersArgs): CharacterHandlers => {
    const coreMutations = createCoreCharacterMutations({
        getDb,
        recordOutbox,
    });
    const genderMutations = createGenderMutations({
        getDb,
        recordOutbox,
    });

    return {
        ...genderMutations,
        ...coreMutations,
    };
};
