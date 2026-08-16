import {AttributeManagerIcon} from '@stagistic/ui';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_MUSIC,
    ATTRIBUTE_MANAGER_PANEL_PLACES,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
} from '../../attributes/attributeManagerMenu';
import {useScriptSettingsModal} from '../../settings/ScriptSettingsModalProvider';
import {SidebarContextButton} from './SidebarContextButton';

const PANEL_LABEL_BY_ID = {
    [ATTRIBUTE_MANAGER_PANEL_STRUCTURE]: 'Structure',
    [ATTRIBUTE_MANAGER_PANEL_CHARACTERS]: 'Characters',
    [ATTRIBUTE_MANAGER_PANEL_MUSIC]: 'Music',
    [ATTRIBUTE_MANAGER_PANEL_PLACES]: 'Places',
} as const satisfies Record<AttributeManagerPanelId, string>;

interface AttributeManagerSidebarButtonProps {
    panelId: AttributeManagerPanelId,
}

export const AttributeManagerSidebarButton = ({
    panelId,
}: AttributeManagerSidebarButtonProps) => {
    const {openAttributeManagerModalWithPanel} = useScriptSettingsModal();
    const label = PANEL_LABEL_BY_ID[panelId];
    const actionLabel = `Open ${label.toLowerCase()} in attribute manager`;

    return (
        <SidebarContextButton
            ariaLabel={actionLabel}
            tooltipLabel={actionLabel}
            onClick={() => openAttributeManagerModalWithPanel(panelId)}
        >
            <AttributeManagerIcon aria-hidden="true" />
        </SidebarContextButton>
    );
};
