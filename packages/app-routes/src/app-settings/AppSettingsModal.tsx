import {
    SettingsModal,
    type SettingsNavGroup,
    useAppThemeMode,
} from '@stagistic/ui';
import {useMemo, useState} from 'react';

import {AppearanceSettingsPanel} from './AppearanceSettingsPanel';
import type {AppSettingsSection} from './types';

const APPEARANCE_PANEL_ID = 'appearance';
const NO_SECTIONS: AppSettingsSection[] = [];

interface AppSettingsModalProps {
    isOpen: boolean,
    onClose: () => void,
    sections?: AppSettingsSection[],
}

/*
 * Stays mounted while closed: it owns the app's theme mode, which has to keep
 * following the system theme whether or not the dialog is open.
 */
export const AppSettingsModal = ({
    isOpen,
    onClose,
    sections = NO_SECTIONS,
}: AppSettingsModalProps) => {
    const [themeMode, setThemeMode] = useAppThemeMode();
    const [selectedPanelId, setSelectedPanelId] = useState(APPEARANCE_PANEL_ID);
    const activeSection = sections.find(section => section.id === selectedPanelId);
    const groups = useMemo<SettingsNavGroup[]>(() => [
        {
            id: 'app',
            label: 'Settings',
            items: [
                {
                    kind: 'item',
                    id: APPEARANCE_PANEL_ID,
                    label: 'Appearance',
                    panelId: APPEARANCE_PANEL_ID,
                },
                ...sections.map(section => ({
                    kind: 'item' as const,
                    id: section.id,
                    label: section.label,
                    panelId: section.id,
                })),
            ],
        },
    ], [sections]);

    return (
        <SettingsModal
            isOpen={isOpen}
            title="Settings"
            size="compact"
            groups={groups}
            activePanelId={activeSection?.id ?? APPEARANCE_PANEL_ID}
            onClose={onClose}
            onSelectPanel={setSelectedPanelId}
        >
            {activeSection ? activeSection.content : (
                <AppearanceSettingsPanel
                    themeMode={themeMode}
                    onThemeModeChange={setThemeMode}
                />
            )}
        </SettingsModal>
    );
};
