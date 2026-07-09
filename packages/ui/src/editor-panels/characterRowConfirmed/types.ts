import type {
    CharacterRowActions,
    CharacterRowModel,
    CharacterRowOptions,
    CharacterRowState,
} from './contracts';

export interface CharacterRowConfirmedProps {
    model: CharacterRowModel,
    state: CharacterRowState,
    actions: CharacterRowActions,
    options: CharacterRowOptions,
}
