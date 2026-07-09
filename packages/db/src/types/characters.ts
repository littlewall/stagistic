import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptCharacterGenders,
    scriptCharacters,
} from '../schema';

export type ScriptCharacter = InferSelectModel<typeof scriptCharacters>;
export type ScriptCharacterGender = InferSelectModel<typeof scriptCharacterGenders>;

export interface ScriptCharacterRef {
    id: string,
    key: string,
    colorHex: string | null,
    genderKey: string | null,
    notes: string | null,
    backstory: string | null,
    outline: string | null,
}

export interface ScriptCharacterGenderOption {
    id: string,
    key: string,
    label: string,
}
