export type {
    ScriptCharacterGenderOption,
    ScriptCharacterRef,
} from '../../../types';
export {
    getScriptCharacterGenderByKey,
    listScriptCharacterGenders,
    upsertScriptCharacterGender,
} from './genders';
export {
    getScriptCharacterById,
    getScriptCharacterByKey,
    listScriptCharacters,
} from './read';
export {
    deleteScriptCharacter,
    touchScriptCharacter,
    updateScriptCharacterBackstory,
    updateScriptCharacterColor,
    updateScriptCharacterGender,
    updateScriptCharacterKey,
    updateScriptCharacterNotes,
    updateScriptCharacterOutline,
    upsertScriptCharacter,
} from './write';
