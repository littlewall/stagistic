import type {FountainElementType} from '@stagistic/editor-core';
import {FountainEditor} from '@stagistic/editor-ui';
import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    mergeEditorSettings,
} from '@stagistic/shared';
import {
    AppHeader,
    AppLayout,
    EditorSidebar,
    LoaderOverlay,
    ScriptSettingsModal,
} from '@stagistic/ui';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';

import {useGlobalModals} from '../../global-modals/GlobalModalsProvider';
import styles from './ScriptEditorRoute.module.css';
import {
    getBlockTypeFromElementPanelId,
    isElementSettingsPanelId,
    SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS,
    SCRIPT_SETTINGS_PANEL_SOURCE,
    type ScriptSettingsPanelId,
} from './settings/settingsMenu';
import {useScriptSettingsModalState} from './settings/useScriptSettingsModalState';
import {useScriptEditorController} from './useScriptEditorController';

const AUTOSAVE_DELAY_MS = 1500;
const SETTINGS_SAVE_DEBOUNCE_MS = 450;
const SIDEBAR_WIDTH = 'calc(280px * var(--size-scale))';
const SETTINGS_MODAL_QUERY_KEY = 'settingsModal';

const SPACING_BEFORE_OPTIONS = [
    0,
    0.5,
    1,
    1.5,
    2,
    2.5,
    3,
    3.5,
    4,
] as const;
const LINE_HEIGHT_OPTIONS = [
    0.8,
    0.9,
    1,
    1.1,
    1.2,
    1.3,
    1.4,
    1.5,
    1.6,
] as const;
const INDENT_SPACING_STEPS = Array.from({length: 41}, (_, index) => index);

const panelDescriptions: Record<string, {
    title: string,
    description: string,
}> = {
    'settings-source': {
        title: 'Settings Source',
        description: 'This script uses its own block settings stored in local config tables.',
    },
    'document-info': {
        title: 'Document Info',
        description: 'Document metadata panel placeholder.',
    },
    production: {
        title: 'Production',
        description: 'Production panel placeholder.',
    },
    'page-layout': {
        title: 'Page Layout',
        description: 'Page size, margins, and typography settings panel placeholder.',
    },
    'headers-footers': {
        title: 'Headers and Footers',
        description: 'Header and footer controls placeholder.',
    },
    'document-statuses': {
        title: 'Document Statuses',
        description: 'Document statuses setup placeholder.',
    },
    notes: {
        title: 'Notes',
        description: 'Document notes configuration placeholder.',
    },
    'account-writing': {
        title: 'Writing Preferences',
        description: 'Account writing preferences placeholder.',
    },
    'account-profile': {
        title: 'Profile',
        description: 'Profile settings placeholder.',
    },
    'account-notifications': {
        title: 'Notifications',
        description: 'Notifications settings placeholder.',
    },
    'account-security': {
        title: 'Password & Security',
        description: 'Security settings placeholder.',
    },
    'account-billing': {
        title: 'Billing',
        description: 'Billing settings placeholder.',
    },
    'account-ai': {
        title: 'AI',
        description: 'AI settings placeholder.',
    },
    'project-statuses': {
        title: 'Project Statuses',
        description: 'Project statuses placeholder.',
    },
};

const isApplePlatform = () => {
    if (typeof navigator === 'undefined') {
        return false;
    }

    const platform = navigator.platform || navigator.userAgent;

    return (/mac|iphone|ipad|ipod/i).test(platform);
};

const formatNumeric = (value: number) => {
    if (Number.isInteger(value)) {
        return value.toString();
    }

    return value.toFixed(1);
};

const formatLines = (value: number) => {
    const label = formatNumeric(value);

    return `${label} line${value === 1 ? '' : 's'}`;
};

const getClosestStepIndex = (steps: readonly number[], value: number) => {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    steps.forEach((step, index) => {
        const distance = Math.abs(step - value);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = index;
        }
    });

    return bestIndex;
};

type IndentKey = 'indentLeftChars' | 'indentRightChars';
type BlockSettingsPatch = Partial<EditorSettings['blocks'][FountainElementType]>;

type StepperFieldProps = {
    valueLabel: string,
    canDecrease: boolean,
    canIncrease: boolean,
    onDecrease: () => void,
    onIncrease: () => void,
};

const StepperField = ({
    valueLabel,
    canDecrease,
    canIncrease,
    onDecrease,
    onIncrease,
}: StepperFieldProps) => {
    return (
        <div className={styles.stepperField}>
            <button
                type="button"
                className={styles.stepperButton}
                onClick={onDecrease}
                disabled={!canDecrease}
                aria-label="Decrease spacing"
            >
                {'<'}
            </button>
            <div className={styles.stepperValue}>{valueLabel}</div>
            <button
                type="button"
                className={styles.stepperButton}
                onClick={onIncrease}
                disabled={!canIncrease}
                aria-label="Increase spacing"
            >
                {'>'}
            </button>
        </div>
    );
};

export const ScriptEditorRoute = () => {
    const navigate = useNavigate();
    const {scriptId} = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const {openNewScript} = useGlobalModals();
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [scriptSettingsDraft, setScriptSettingsDraft] = useState<EditorSettingsOverride>({});
    const settingsSaveTimerRef = useRef<number | null>(null);
    const {
        isOpen: isSettingsOpen,
        activePanelId,
        expandedItemIds,
        groups,
        open: openSettingsModal,
        close: closeSettingsModal,
        selectPanel,
        toggleExpanded,
    } = useScriptSettingsModalState();
    const {
        currentScript,
        currentScriptId,
        recentScripts,
        initialValue,
        scriptSettingsOverride,
        storageError,
        shouldAutoFocus,
        saveIndicator,
        editorLoadState,
        handleAutoSave,
        handleManualSave,
        handleSaveScriptSettingsOverride,
    } = useScriptEditorController(scriptId);

    const shortcutPrefix = useMemo(
        () => isApplePlatform() ? 'Cmd' : 'Ctrl',
        [],
    );
    const blockLabelByType = useMemo(() => {
        return new Map(
            SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => [item.blockType, item.label]),
        );
    }, []);
    const resolvedScriptSettings = useMemo(
        () => mergeEditorSettings(DEFAULT_EDITOR_SETTINGS, scriptSettingsDraft),
        [scriptSettingsDraft],
    );
    const draftSerialized = useMemo(
        () => JSON.stringify(scriptSettingsDraft ?? {}),
        [scriptSettingsDraft],
    );
    const loadedSerialized = useMemo(
        () => JSON.stringify(scriptSettingsOverride ?? {}),
        [scriptSettingsOverride],
    );

    const scenes = useMemo(() => {
        return [];
    }, []);

    const clearSettingsSaveTimer = useCallback(() => {
        if (!settingsSaveTimerRef.current) {
            return;
        }

        window.clearTimeout(settingsSaveTimerRef.current);
        settingsSaveTimerRef.current = null;
    }, []);

    useEffect(() => {
        if (scriptSettingsOverride === undefined) {
            return;
        }

        setScriptSettingsDraft(scriptSettingsOverride ?? {});
    }, [currentScriptId, scriptSettingsOverride]);

    useEffect(() => {
        if (!currentScriptId || scriptSettingsOverride === undefined) {
            return;
        }

        if (draftSerialized === loadedSerialized) {
            return;
        }

        clearSettingsSaveTimer();

        const snapshot = scriptSettingsDraft;

        settingsSaveTimerRef.current = window.setTimeout(() => {
            void handleSaveScriptSettingsOverride(snapshot);
        }, SETTINGS_SAVE_DEBOUNCE_MS);

        return () => {
            clearSettingsSaveTimer();
        };
    }, [
        clearSettingsSaveTimer,
        currentScriptId,
        draftSerialized,
        handleSaveScriptSettingsOverride,
        loadedSerialized,
        scriptSettingsDraft,
        scriptSettingsOverride,
    ]);

    useEffect(() => {
        return () => {
            clearSettingsSaveTimer();
        };
    }, [clearSettingsSaveTimer]);

    const handleSelectScript = useCallback((script: {id: string}) => {
        void navigate(`/script/${script.id}/editor`);
    }, [navigate]);
    const handleHome = useCallback(() => {
        void navigate('/');
    }, [navigate]);
    const handleNewScript = useCallback(() => {
        openNewScript();
    }, [openNewScript]);
    const handleMenuAction = useCallback((actionId: string) => {
        if (actionId === 'scripts') {
            void navigate('/script/list');

            return;
        }

        if (actionId === 'settings' && currentScript) {
            openSettingsModal();

            return;
        }

        if (actionId === 'new-script') {
            openNewScript();
        }
    }, [
        currentScript,
        navigate,
        openSettingsModal,
        openNewScript,
    ]);
    const handleCloseSettings = useCallback(() => {
        closeSettingsModal();
        if (!searchParams.has(SETTINGS_MODAL_QUERY_KEY)) {
            return;
        }

        setSearchParams(previous => {
            const next = new URLSearchParams(previous);

            next.delete(SETTINGS_MODAL_QUERY_KEY);

            return next;
        }, {replace: true});
    }, [
        closeSettingsModal,
        searchParams,
        setSearchParams,
    ]);
    const handleSceneClick = useCallback(() => {}, []);
    const handleToggleLeftSidebar = useCallback(() => {
        setIsLeftSidebarOpen(previous => !previous);
    }, []);
    const handleToggleRightSidebar = useCallback(() => {
        setIsRightSidebarOpen(previous => !previous);
    }, []);

    const updateBlockSettings = useCallback((
        blockType: FountainElementType,
        patch: BlockSettingsPatch,
    ) => {
        setScriptSettingsDraft(previous => ({
            ...previous,
            blocks: {
                ...previous.blocks ?? {},
                [blockType]: {
                    ...previous.blocks?.[blockType] ?? {},
                    ...patch,
                },
            },
        }));
    }, []);

    const getIndentStepState = useCallback((
        blockType: FountainElementType,
        key: IndentKey,
    ) => {
        const currentValue = resolvedScriptSettings.blocks[blockType]?.[key] ?? 0;
        const normalizedValue = Math.max(0, Math.round(currentValue));
        const steps = INDENT_SPACING_STEPS.includes(normalizedValue)
            ? INDENT_SPACING_STEPS
            : [...INDENT_SPACING_STEPS, normalizedValue].sort((a, b) => a - b);
        const currentIndex = getClosestStepIndex(steps, normalizedValue);

        return {
            value: normalizedValue,
            steps,
            currentIndex,
        };
    }, [resolvedScriptSettings.blocks]);

    const changeIndentWithStep = useCallback((
        blockType: FountainElementType,
        key: IndentKey,
        direction: -1 | 1,
    ) => {
        const {
            steps,
            currentIndex,
        } = getIndentStepState(blockType, key);
        const nextIndex = Math.max(0, Math.min(steps.length - 1, currentIndex + direction));

        if (nextIndex === currentIndex) {
            return;
        }

        updateBlockSettings(blockType, {
            [key]: steps[nextIndex],
        });
    }, [getIndentStepState, updateBlockSettings]);

    const renderSettingsPanel = useCallback((panelId: string) => {
        if (isElementSettingsPanelId(panelId)) {
            const blockType = getBlockTypeFromElementPanelId(panelId);

            if (!blockType) {
                return null;
            }

            const blockDefaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];
            const blockSettings = resolvedScriptSettings.blocks[blockType];
            const blockLabel = blockLabelByType.get(blockType) ?? 'Element';
            const spacingBefore = blockSettings.spacingBeforeEm ?? blockDefaults.spacingBeforeEm ?? 0;
            const lineHeight = blockSettings.lineHeight ?? blockDefaults.lineHeight ?? 1;
            const shortcut = blockSettings.shortcut ?? blockDefaults.shortcut ?? BLOCK_SHORTCUT_OPTIONS[0];
            const nextElement = blockSettings.nextElement ?? blockDefaults.nextElement ?? blockType;
            const textAlign = blockSettings.textAlign ?? blockDefaults.textAlign ?? BLOCK_TEXT_ALIGN_OPTIONS[0];
            const casing = blockSettings.casing ?? blockDefaults.casing ?? BLOCK_CASING_OPTIONS[0];
            const isBold = blockSettings.isBold ?? blockDefaults.isBold ?? false;
            const isItalic = blockSettings.isItalic ?? blockDefaults.isItalic ?? false;
            const isUnderline = blockSettings.isUnderline ?? blockDefaults.isUnderline ?? false;
            const spacingBeforeOptions = SPACING_BEFORE_OPTIONS.includes(spacingBefore as never)
                ? SPACING_BEFORE_OPTIONS
                : [...SPACING_BEFORE_OPTIONS, spacingBefore].sort((a, b) => a - b);
            const lineHeightOptions = LINE_HEIGHT_OPTIONS.includes(lineHeight as never)
                ? LINE_HEIGHT_OPTIONS
                : [...LINE_HEIGHT_OPTIONS, lineHeight].sort((a, b) => a - b);
            const leftIndentState = getIndentStepState(blockType, 'indentLeftChars');
            const rightIndentState = getIndentStepState(blockType, 'indentRightChars');

            return (
                <div className={styles.panelStack}>
                    <h3 className={styles.panelTitle}>{blockLabel}</h3>
                    <p className={styles.panelDescription}>
                        Configure formatting and behavior for this block type.
                    </p>
                    <div className={styles.settingsGrid}>
                        <label className={styles.fieldLabel} htmlFor="settings-spacing-before">Spacing before</label>
                        <select
                            id="settings-spacing-before"
                            className={styles.fieldControl}
                            value={spacingBefore}
                            onChange={event => {
                                updateBlockSettings(blockType, {
                                    spacingBeforeEm: Number.parseFloat(event.target.value),
                                });
                            }}
                        >
                            {spacingBeforeOptions.map(option => (
                                <option key={option} value={option}>
                                    {formatLines(option)}
                                </option>
                            ))}
                        </select>
                        <label className={styles.fieldLabel} htmlFor="settings-line-height">Line height</label>
                        <select
                            id="settings-line-height"
                            className={styles.fieldControl}
                            value={lineHeight}
                            onChange={event => {
                                updateBlockSettings(blockType, {
                                    lineHeight: Number.parseFloat(event.target.value),
                                });
                            }}
                        >
                            {lineHeightOptions.map(option => (
                                <option key={option} value={option}>
                                    {formatNumeric(option)}
                                </option>
                            ))}
                        </select>
                        <span className={styles.fieldLabel}>Shortcut</span>
                        <div className={styles.shortcutField}>
                            <span className={styles.shortcutPrefix}>{shortcutPrefix} +</span>
                            <select
                                className={styles.fieldControl}
                                value={shortcut}
                                onChange={event => {
                                    updateBlockSettings(blockType, {
                                        shortcut: event.target.value as typeof shortcut,
                                    });
                                }}
                            >
                                {BLOCK_SHORTCUT_OPTIONS.map(option => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <label className={styles.fieldLabel} htmlFor="settings-next-element">Next element</label>
                        <select
                            id="settings-next-element"
                            className={styles.fieldControl}
                            value={nextElement}
                            onChange={event => {
                                updateBlockSettings(blockType, {
                                    nextElement: event.target.value as FountainElementType,
                                });
                            }}
                        >
                            {SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => (
                                <option key={item.blockType} value={item.blockType}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                        <label className={styles.fieldLabel} htmlFor="settings-text-align">Alignment</label>
                        <select
                            id="settings-text-align"
                            className={styles.fieldControl}
                            value={textAlign}
                            onChange={event => {
                                updateBlockSettings(blockType, {
                                    textAlign: event.target.value as typeof textAlign,
                                });
                            }}
                        >
                            {BLOCK_TEXT_ALIGN_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <label className={styles.fieldLabel} htmlFor="settings-casing">Casing</label>
                        <select
                            id="settings-casing"
                            className={styles.fieldControl}
                            value={casing}
                            onChange={event => {
                                updateBlockSettings(blockType, {
                                    casing: event.target.value as typeof casing,
                                });
                            }}
                        >
                            {BLOCK_CASING_OPTIONS.map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        <span className={styles.fieldLabel}>Text style</span>
                        <div className={styles.toggleGroup}>
                            <button
                                type="button"
                                className={isBold ? styles.toggleButtonActive : styles.toggleButton}
                                onClick={() => updateBlockSettings(blockType, {isBold: !isBold})}
                            >
                                Bold
                            </button>
                            <button
                                type="button"
                                className={isItalic ? styles.toggleButtonActive : styles.toggleButton}
                                onClick={() => updateBlockSettings(blockType, {isItalic: !isItalic})}
                            >
                                Italic
                            </button>
                            <button
                                type="button"
                                className={isUnderline ? styles.toggleButtonActive : styles.toggleButton}
                                onClick={() => updateBlockSettings(blockType, {isUnderline: !isUnderline})}
                            >
                                Underline
                            </button>
                        </div>
                        <span className={styles.fieldLabel}>Spacing left</span>
                        <StepperField
                            valueLabel={`${leftIndentState.value} ch`}
                            canDecrease={leftIndentState.currentIndex > 0}
                            canIncrease={leftIndentState.currentIndex < leftIndentState.steps.length - 1}
                            onDecrease={() => changeIndentWithStep(blockType, 'indentLeftChars', -1)}
                            onIncrease={() => changeIndentWithStep(blockType, 'indentLeftChars', 1)}
                        />
                        <span className={styles.fieldLabel}>Spacing right</span>
                        <StepperField
                            valueLabel={`${rightIndentState.value} ch`}
                            canDecrease={rightIndentState.currentIndex > 0}
                            canIncrease={rightIndentState.currentIndex < rightIndentState.steps.length - 1}
                            onDecrease={() => changeIndentWithStep(blockType, 'indentRightChars', -1)}
                            onIncrease={() => changeIndentWithStep(blockType, 'indentRightChars', 1)}
                        />
                    </div>
                    <p className={styles.panelCaption}>
                        Settings are persisted per script and prepared for future cloud sync.
                    </p>
                </div>
            );
        }

        const panel = panelDescriptions[panelId];

        if (panelId === SCRIPT_SETTINGS_PANEL_SOURCE) {
            return (
                <div className={styles.panelStack}>
                    <h3 className={styles.panelTitle}>{panel?.title ?? 'Settings Source'}</h3>
                    <p className={styles.panelDescription}>
                        {panel?.description ?? 'Settings are stored in local script config tables.'}
                    </p>
                    <div className={styles.infoCard}>
                        <span className={styles.infoLabel}>Config namespace</span>
                        <span className={styles.infoValue}>editor</span>
                    </div>
                </div>
            );
        }

        if (!panel) {
            return (
                <div className={styles.panelStack}>
                    <h3 className={styles.panelTitle}>Settings</h3>
                    <p className={styles.panelDescription}>No panel configured for this item yet.</p>
                </div>
            );
        }

        return (
            <div className={styles.panelStack}>
                <h3 className={styles.panelTitle}>{panel.title}</h3>
                <p className={styles.panelDescription}>{panel.description}</p>
                <div className={styles.placeholderCard}>Coming soon</div>
            </div>
        );
    }, [
        blockLabelByType,
        changeIndentWithStep,
        getIndentStepState,
        resolvedScriptSettings.blocks,
        shortcutPrefix,
        updateBlockSettings,
    ]);

    useEffect(() => {
        if (searchParams.get(SETTINGS_MODAL_QUERY_KEY) !== '1') {
            return;
        }

        openSettingsModal();
    }, [openSettingsModal, searchParams]);

    const showEditorLoader = editorLoadState.isLoading || !initialValue;

    if (showEditorLoader) {
        return (
            <LoaderOverlay
                title="Připravuji editor"
                subtitle="Načítám scénář a editorové prostředí"
                progress={editorLoadState.progress}
                statusText={editorLoadState.statusText}
                hint={storageError ?? 'Prosím vyčkejte, připravujeme editor.'}
            />
        );
    }

    return (
        <AppLayout
            header={(
                <AppHeader
                    currentScript={currentScript ?? undefined}
                    recentScripts={recentScripts}
                    onSelectScript={handleSelectScript}
                    onHome={handleHome}
                    onNewScript={handleNewScript}
                    scriptSyncState={saveIndicator}
                    onMenuAction={handleMenuAction}
                />
            )}
        >
            {storageError ? (
                <div role="alert" style={{padding: '12px 20px'}}>
                    {storageError}
                </div>
            ) : null}
            <FountainEditor
                key={currentScript?.id ?? 'editor'}
                initialValue={initialValue}
                scriptSettings={scriptSettingsDraft}
                onAutoSave={handleAutoSave}
                onManualSave={handleManualSave}
                autoSaveDelayMs={AUTOSAVE_DELAY_MS}
                autoFocus={shouldAutoFocus}
                leftSidebarToggle={{
                    isOpen: isLeftSidebarOpen,
                    onToggle: handleToggleLeftSidebar,
                }}
                rightSidebarToggle={{
                    isOpen: isRightSidebarOpen,
                    onToggle: handleToggleRightSidebar,
                }}
                leftSidebar={<div className={styles.sidebarPlaceholder} />}
                rightSidebar={(
                    <EditorSidebar
                        scenes={scenes}
                        onSceneClick={handleSceneClick}
                        className={styles.sidebarContent}
                    />
                )}
                sidebarWidth={SIDEBAR_WIDTH}
            />
            <ScriptSettingsModal
                isOpen={isSettingsOpen}
                title={currentScript ? `${currentScript.name} Settings` : 'Script Settings'}
                groups={groups}
                activePanelId={activePanelId}
                expandedItemIds={expandedItemIds}
                onClose={handleCloseSettings}
                onSelectPanel={panelId => selectPanel(panelId as ScriptSettingsPanelId)}
                onToggleExpand={toggleExpanded}
                renderPanel={renderSettingsPanel}
            />
        </AppLayout>
    );
};
