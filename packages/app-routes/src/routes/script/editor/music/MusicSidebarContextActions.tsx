import {PlusIcon} from '@stagistic/ui';

import {SidebarContextButton} from '../sidebar/SidebarContextButton';

interface MusicSidebarContextActionsProps {
    onAddMusic: (returnFocus?: HTMLElement | null) => void,
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
