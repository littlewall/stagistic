import {PlusIcon} from '@stagistic/ui';

import {SidebarContextButton} from '../sidebar/SidebarContextButton';

interface CharactersSidebarContextActionsProps {
    onAddCharacter: (returnFocus?: HTMLElement | null) => void,
}

export const CharactersSidebarContextActions = ({
    onAddCharacter,
}: CharactersSidebarContextActionsProps) => (
    <SidebarContextButton
        ariaLabel="Add character"
        tooltipLabel="Add character"
        onClick={onAddCharacter}
    >
        <PlusIcon aria-hidden="true" />
    </SidebarContextButton>
);
