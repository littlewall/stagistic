import {PlusIcon} from '@stagistic/ui';

import {SidebarContextButton} from '../sidebar';

interface CuesSidebarContextActionsProps {
    onAddCue: () => void,
}

export const CuesSidebarContextActions = ({
    onAddCue,
}: CuesSidebarContextActionsProps) => (
    <SidebarContextButton
        ariaLabel="Add Cue"
        tooltipLabel="Add Cue"
        onClick={onAddCue}
    >
        <PlusIcon aria-hidden="true" />
    </SidebarContextButton>
);
