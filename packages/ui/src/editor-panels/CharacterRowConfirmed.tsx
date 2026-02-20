import {CharacterRowDetails} from './characterRowConfirmed/CharacterRowDetails';
import {CharacterRowHeader} from './characterRowConfirmed/CharacterRowHeader';
import type {CharacterRowConfirmedProps} from './characterRowConfirmed/types';
import {useCharacterRowController} from './characterRowConfirmed/useCharacterRowController';

export const CharacterRowConfirmed = ({
    model,
    state,
    actions,
    options,
}: CharacterRowConfirmedProps) => {
    const {
        headerProps,
        detailsProps,
    } = useCharacterRowController({
        model,
        state,
        actions,
        options,
    });

    return (
        <>
            <CharacterRowHeader {...headerProps} />
            <CharacterRowDetails {...detailsProps} />
        </>
    );
};
