import {TableIcon} from '@stagistic/ui';

import {
    ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
    ATTRIBUTE_MANAGER_PANEL_CUES,
    ATTRIBUTE_MANAGER_PANEL_PLACES,
    ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
    type AttributeManagerPanelId,
} from '../../attributes/attributeManagerMenu';
import {useScriptSettingsModal} from '../../settings/ScriptSettingsModalProvider';
import {SidebarContextButton} from './SidebarContextButton';

const PANEL_LABEL_BY_ID = {
    [ATTRIBUTE_MANAGER_PANEL_STRUCTURE]: 'Structure',
    [ATTRIBUTE_MANAGER_PANEL_CHARACTERS]: 'Characters',
    [ATTRIBUTE_MANAGER_PANEL_CUES]: 'Cues',
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

    return (
        <SidebarContextButton
            ariaLabel={`Open ${label} in attribute manager`}
            tooltipLabel={`Manage ${label.toLowerCase()}`}
            onClick={() => openAttributeManagerModalWithPanel(panelId)}
        >
            <TableIcon aria-hidden="true" />
        </SidebarContextButton>
    );
};
