// ─── Theme ──────────────────────────────────────────────────────────────────
export {
    APP_THEME_STORAGE_KEY,
    applyAppTheme,
    applyAppThemeMode,
    type AppTheme,
    type AppThemeMode,
    bootstrapAppTheme,
    DEFAULT_APP_THEME,
    DEFAULT_APP_THEME_MODE,
    isAppTheme,
    isAppThemeMode,
    readPreferredAppTheme,
    readPreferredAppThemeMode,
    readStoredAppTheme,
    readStoredAppThemeMode,
    readSystemAppTheme,
    resolveAppTheme,
    subscribeToSystemThemeChange,
    toggleAppTheme,
    toggleAppThemeMode,
} from './theme/theme';

// ─── Icons ──────────────────────────────────────────────────────────────────
export * from './icons';

// ─── Hooks ──────────────────────────────────────────────────────────────────
export {useKeyedFieldDrafts} from './hooks/useKeyedFieldDrafts';

// ─── Primitives ─────────────────────────────────────────────────────────────
export {Overlay, type OverlayProps} from './primitives/Overlay/Overlay';
export {Panel, type PanelProps} from './primitives/Panel/Panel';
export {Skeleton, type SkeletonProps} from './primitives/Skeleton/Skeleton';
export {Stack, type StackProps} from './primitives/Stack/Stack';
export {Text, type TextProps} from './primitives/Text/Text';

// ─── Atoms ──────────────────────────────────────────────────────────────────
export {Button} from './atoms/Button/Button';
export {Checkbox, type CheckboxProps} from './atoms/Checkbox/Checkbox';
export {IconButton} from './atoms/IconButton/IconButton';
export {InlineTooltip} from './atoms/InlineTooltip/InlineTooltip';
export {Input} from './atoms/Input/Input';
export {ProgressCircle} from './atoms/ProgressCircle/ProgressCircle';
export {RadioChoiceGroup, type RadioChoiceOption} from './atoms/RadioChoiceGroup/RadioChoiceGroup';
export {SearchInput, type SearchInputProps} from './atoms/SearchInput/SearchInput';
export {Switch} from './atoms/Switch/Switch';
export {Tag} from './atoms/Tag/Tag';
export {Tooltip, type TooltipProps} from './atoms/Tooltip/Tooltip';

// ─── Molecules ──────────────────────────────────────────────────────────────
export {ActionCard, type ActionCardProps} from './molecules/ActionCard/ActionCard';
export {ButtonGroup} from './molecules/ButtonGroup/ButtonGroup';
export {
    Card, CardContent, CardFooter, CardHeader,
} from './molecules/Card/Card';
export {ListPanel, type ListPanelProps} from './molecules/ListPanel/ListPanel';
export {ListRow, type ListRowProps} from './molecules/ListRow/ListRow';
export {SearchControl, type SearchControlProps} from './molecules/SearchControl/SearchControl';
export {
    ToggleButtonGroup, type ToggleButtonGroupOption, type ToggleButtonGroupProps,
} from './molecules/ToggleButtonGroup/ToggleButtonGroup';

// Menus & popovers
export {
    DropdownMenu, type DropdownMenuItem, type DropdownMenuProps,
} from './molecules/DropdownMenu/DropdownMenu';
export {IconDropdownMenu, type IconDropdownMenuProps} from './molecules/IconDropdownMenu/IconDropdownMenu';
export {IconPopover, type IconPopoverProps} from './molecules/IconPopover/IconPopover';
export {MoreActionsMenu, type MoreActionsMenuProps} from './molecules/MoreActionsMenu/MoreActionsMenu';
export {ScriptActionsMenu} from './molecules/ScriptActionsMenu/ScriptActionsMenu';

// ─── Forms ──────────────────────────────────────────────────────────────────
export {FormSelect, type FormSelectOption} from './molecules/forms/FormSelect/FormSelect';
export {
    InputTable, type InputTableColumnDef, type InputTableProps, type InputTableRow, type InputTableRowCount,
} from './molecules/forms/InputTable/InputTable';
export {MultiComboBox, type MultiComboBoxOption} from './molecules/forms/MultiComboBox/MultiComboBox';
export {Select, type SelectOption} from './molecules/forms/Select/Select';
export {
    PanelHeader, SettingRow, SettingsGroup,
} from './molecules/forms/SettingsGroup/SettingsGroup';
export {SettingSwitch} from './molecules/forms/SettingSwitch/SettingSwitch';
export {formControlStyles} from './molecules/forms/shared/formControlStyles';
export {useAnchoredMenuPlacement} from './molecules/forms/shared/useAnchoredMenuHeight';
export {useDropdownDismiss} from './molecules/forms/shared/useDropdownDismiss';
export {TextInput} from './molecules/forms/TextInput/TextInput';

// ─── Organisms ──────────────────────────────────────────────────────────────
export {Grid} from './organisms/Grid/Grid';
export {HeroLayout} from './organisms/HeroLayout/HeroLayout';
export {PageContainer} from './organisms/PageContainer/PageContainer';
export {PageHeader} from './organisms/PageHeader/PageHeader';
export {Section, SectionHeader} from './organisms/Section/Section';

// ─── Feedback ───────────────────────────────────────────────────────────────
export {LoaderOverlay} from './feedback/LoaderOverlay/LoaderOverlay';
export {Notice} from './feedback/Notice/Notice';
export {ProgressBar} from './feedback/ProgressBar/ProgressBar';
export {ProgressPanel} from './feedback/ProgressPanel/ProgressPanel';
export {
    type ToastContent, ToastProvider, useToastController,
} from './feedback/ToastProvider/ToastProvider';

// ─── App layout ─────────────────────────────────────────────────────────────
export {AppFooter} from './layout/AppFooter';
export {
    AppHeader,
    type AppHeaderProps,
    ScriptEditorAppHeader,
    type ScriptEditorAppHeaderProps,
    type ScriptListItem,
    type ScriptSyncState,
    type ScriptView,
} from './layout/AppHeader';
export {AppLayout} from './layout/AppLayout';
export {SidebarActionsGroup} from './layout/SidebarActionsGroup';
export {SidebarMiniHeader, type SidebarMiniHeaderProps} from './layout/SidebarMiniHeader';

// ─── Dialogs: modal building blocks ─────────────────────────────────────────
export {ConfirmModal, type ConfirmModalProps} from './dialogs/modal/ConfirmModal';
export {ModalActions, type ModalActionsProps} from './dialogs/modal/ModalActions';
export {ModalDialog} from './dialogs/modal/ModalDialog';
export {ModalHeader, type ModalHeaderProps} from './dialogs/modal/ModalHeader';
export {TypeToConfirmAction, type TypeToConfirmActionProps} from './dialogs/modal/TypeToConfirmAction';

// ─── Dialogs: script ────────────────────────────────────────────────────────
export {DELETE_SCRIPT_CONFIRM_PHRASE} from './dialogs/script/deleteScriptConfirmPhrase';
export {DeleteScriptModal} from './dialogs/script/DeleteScriptModal';
export {
    DuplicateScriptModal, type DuplicateScriptModalProps, type DuplicateScriptSubmit,
} from './dialogs/script/DuplicateScriptModal';
export type {StepkgPeekResult} from './dialogs/script/import/types';
export {ImportScriptModal} from './dialogs/script/ImportScriptModal';
export {NewScriptModal} from './dialogs/script/NewScriptModal';
export {PublicPreviewNotice} from './dialogs/script/PublicPreviewNotice';
export {
    RenameScriptModal, type RenameScriptModalProps, type RenameScriptSubmit,
} from './dialogs/script/RenameScriptModal';
export {
    ScriptSettingsModal, type SettingsNavGroup, type SettingsNavItem, type SettingsNavSubItem,
} from './dialogs/script/ScriptSettingsModal';
export type {NewScriptShape} from './dialogs/script/types';

// ─── Dialogs: attribute manager ─────────────────────────────────────────────
export {AttributeManagerCharactersPanel} from './dialogs/attribute-manager/AttributeManagerCharactersPanel';
export type {
    AttributeManagerCharacter,
    AttributeManagerCharactersPanelProps,
    AttributeManagerCharacterWorkspaceId,
    AttributeManagerGroup,
} from './dialogs/attribute-manager/attributeManagerCharacterTypes';
export {type AttributeManagerDetailTab, AttributeManagerDetailTabs} from './dialogs/attribute-manager/AttributeManagerDetailTabs';
export {AttributeManagerGroupDetail} from './dialogs/attribute-manager/AttributeManagerGroupDetail';
export {
    type AttributeManagerListItem,
    AttributeManagerListPanel,
    type AttributeManagerListPanelProps,
} from './dialogs/attribute-manager/AttributeManagerListPanel';
export {
    AttributeManagerModal, type AttributeManagerModalProps, type AttributeManagerTab,
} from './dialogs/attribute-manager/AttributeManagerModal';
export {
    AttributeManagerMusicDetail,
    type AttributeManagerMusicDetailProps,
    type MusicAttachmentSlotView,
    type MusicAttachmentView,
    type MusicKind,
} from './dialogs/attribute-manager/AttributeManagerMusicDetail';
export {
    type AttributeManagerPlace,
    AttributeManagerPlacesPanel,
    type AttributeManagerPlacesPanelProps,
} from './dialogs/attribute-manager/AttributeManagerPlacesPanel';
export {AttributeManagerSceneDetail, type AttributeManagerSceneDetailProps} from './dialogs/attribute-manager/AttributeManagerSceneDetail';
export {CreateCharacterModal, type CreateCharacterModalProps} from './dialogs/attribute-manager/CreateCharacterModal';
export {CreateGroupModal, type CreateGroupModalProps} from './dialogs/attribute-manager/CreateGroupModal';
export {CreatePlaceModal, type CreatePlaceModalProps} from './dialogs/attribute-manager/CreatePlaceModal';
export {RemoveAttachmentModal, type RemoveAttachmentModalProps} from './dialogs/attribute-manager/RemoveAttachmentModal';
export {RemoveGroupModal, type RemoveGroupModalProps} from './dialogs/attribute-manager/RemoveGroupModal';

// ─── Editor panels ──────────────────────────────────────────────────────────
export {
    EditorSidebar, type EditorSidebarCharacter, type EditorSidebarGroup,
} from './editor-panels/EditorSidebar';
export {ExportPanel} from './export/ExportPanel';
