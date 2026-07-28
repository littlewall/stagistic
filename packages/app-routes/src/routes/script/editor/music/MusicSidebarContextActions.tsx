import {PlusIcon} from '@stagistic/ui';

import {SidebarContextButton} from '../sidebar';

interface MusicSidebarContextActionsProps {
    onAddMusic: () => void,
}

export const MusicSidebarContextActions = ({
    onAddMusic,
}: MusicSidebarContextActionsProps) => (
    <SidebarContextButton
        ariaLabel="Add music"
        tooltipLabel="Add music"
        onClick={onAddMusic}
    >
        <PlusIcon aria-hidden="true" />
    </SidebarContextButton>
);
