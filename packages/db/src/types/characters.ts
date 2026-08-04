import type {InferSelectModel} from 'drizzle-orm';

import {
    scriptCharacterGenders,
    scriptCharacters,
} from '../schema';

export type ScriptCharacter = InferSelectModel<typeof scriptCharacters>;
export type ScriptCharacterGender = InferSelectModel<typeof scriptCharacterGenders>;

export type ScriptCharacterKind = 'character' | 'group';

export interface ScriptCharacterRef {
    id: string,
    kind: 'character',
    key: string,
    colorHex: string | null,
    genderKey: string | null,
    notes: string | null,
    backstory: string | null,
    outline: string | null,
}

export interface ScriptCharacterGroupRef {
    id: string,
    kind: 'group',
    key: string,
    colorHex: string | null,
    memberIds: string[],
}

export type ScriptSpeakingEntityRef = ScriptCharacterRef | ScriptCharacterGroupRef;

export interface ScriptCharacterGenderOption {
    id: string,
    key: string,
    label: string,
}
