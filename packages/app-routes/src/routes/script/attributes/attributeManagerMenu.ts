import type {AttributeManagerTab} from '@stagistic/ui';

export const ATTRIBUTE_MANAGER_PANEL_STRUCTURE = 'structure';
export const ATTRIBUTE_MANAGER_PANEL_CHARACTERS = 'characters';
export const ATTRIBUTE_MANAGER_PANEL_CUES = 'cues';
export const ATTRIBUTE_MANAGER_PANEL_PLACES = 'places';

export type AttributeManagerPanelId =
    | typeof ATTRIBUTE_MANAGER_PANEL_STRUCTURE
    | typeof ATTRIBUTE_MANAGER_PANEL_CHARACTERS
    | typeof ATTRIBUTE_MANAGER_PANEL_CUES
    | typeof ATTRIBUTE_MANAGER_PANEL_PLACES;

export const attributeManagerTabs: AttributeManagerTab[] = [
    {
        id: ATTRIBUTE_MANAGER_PANEL_STRUCTURE,
        label: 'Structure',
    },
    {
        id: ATTRIBUTE_MANAGER_PANEL_CHARACTERS,
        label: 'Characters',
    },
    {
        id: ATTRIBUTE_MANAGER_PANEL_CUES,
        label: 'Cues',
    },
    {
        id: ATTRIBUTE_MANAGER_PANEL_PLACES,
        label: 'Places',
    },
];
