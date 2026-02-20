import type {
    CharacterGenderIcon,
    CharacterRowActions,
    CharacterRowModel,
    CharacterRowOptions,
    CharacterRowState,
    GenderListOption,
} from './contracts';

export interface CharacterRowConfirmedProps {
    model: CharacterRowModel,
    state: CharacterRowState,
    actions: CharacterRowActions,
    options: CharacterRowOptions,
}
export type {
    CharacterGenderIcon,
    GenderListOption,
};
