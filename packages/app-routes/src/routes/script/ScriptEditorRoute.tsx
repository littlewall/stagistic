import {
    ELEMENT_ACTION,
    ELEMENT_CENTERED,
    ELEMENT_CHARACTER,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_LYRICS,
    ELEMENT_PARENTHETICAL,
    ELEMENT_SCENE_HEADING,
    ELEMENT_TRANSITION,
    type FountainElementType,
} from '@stagistic/editor-core';
import {
    BLOCK_ICONS,
    FountainEditor,
} from '@stagistic/editor-ui';
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
    type CSSProperties,
    type ReactNode,
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
const SCREENPLAY_CHARS_PER_INCH = 10;

const SPACING_BEFORE_OPTIONS = [
    0,
    1,
    1.5,
    2,
] as const;
const LINE_HEIGHT_OPTIONS = [
    1,
    1.25,
    1.5,
    1.75,
    2,
] as const;
const INDENT_SPACING_STEPS = Array.from({length: 41}, (_, index) => index);
const MAX_INDENT_CHARS = INDENT_SPACING_STEPS[INDENT_SPACING_STEPS.length - 1] ?? 40;
const MIN_PREVIEW_CONTENT_CHARS = 30;

const BLOCK_PREVIEW_TEXT: Record<FountainElementType, string> = {
    [ELEMENT_SCENE_HEADING]: 'INT. LOREM MANSION - DAY',
    [ELEMENT_ACTION]: 'She closes the door and exhales.',
    [ELEMENT_CHARACTER]: 'ALEX',
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: 'ALEX',
    [ELEMENT_DUAL_DIALOGUE]: 'I will answer you on the overlap.',
    [ELEMENT_PARENTHETICAL]: '(quietly)',
    [ELEMENT_DIALOGUE]: 'I think this is where it starts.',
    [ELEMENT_TRANSITION]: 'CUT TO:',
    [ELEMENT_LYRICS]: 'Sing me a line for the morning.',
    [ELEMENT_CENTERED]: 'THE END',
};

const panelDescriptions: Record<string, {
    title: string,
    description: string,
}> = {
    'settings-source': {
        title: 'Settings Source',
        description: 'Editor settings are currently stored in local config tables.',
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

    return value
        .toFixed(2)
        .replace(/\.?0+$/, '');
};

const formatLines = (value: number) => {
    const label = formatNumeric(value);

    return `${label} line${value === 1 ? '' : 's'}`;
};

const formatInches = (value: number) => `${value.toFixed(2)}"`;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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

type BlockSettingsPatch = Partial<EditorSettings['blocks'][FountainElementType]>;

type SettingsSelectOption = {
    value: number | string,
    label: string,
    icon?: ReactNode,
};

type SettingsSelectProps = {
    id?: string,
    value: number | string,
    options: SettingsSelectOption[],
    ariaLabel: string,
    onChange: (value: number | string) => void,
};

const getClosestStepValue = (steps: readonly number[], value: number) => {
    const closestIndex = getClosestStepIndex(steps, value);

    return steps[closestIndex] ?? steps[0] ?? value;
};

const normalizeSettingsOverride = (settings: EditorSettingsOverride): EditorSettingsOverride => {
    if (!settings.blocks) {
        return settings;
    }

    const nextBlocks = Object.entries(settings.blocks).reduce<NonNullable<EditorSettingsOverride['blocks']>>(
        (acc, [blockType, blockSettings]) => {
            if (!blockSettings) {
                acc[blockType as FountainElementType] = blockSettings;

                return acc;
            }

            const normalizedBlockSettings = {
                ...blockSettings,
            };

            if (typeof blockSettings.spacingBeforeEm === 'number') {
                normalizedBlockSettings.spacingBeforeEm = getClosestStepValue(
                    SPACING_BEFORE_OPTIONS,
                    blockSettings.spacingBeforeEm,
                );
            }

            if (typeof blockSettings.lineHeight === 'number') {
                normalizedBlockSettings.lineHeight = getClosestStepValue(
                    LINE_HEIGHT_OPTIONS,
                    blockSettings.lineHeight,
                );
            }

            acc[blockType as FountainElementType] = normalizedBlockSettings;

            return acc;
        },
        {},
    );

    return {
        ...settings,
        blocks: nextBlocks,
    };
};

const SettingsSelect = ({
    id,
    value,
    options,
    ariaLabel,
    onChange,
}: SettingsSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement | null>(null);
    const selectedOption = useMemo(
        () => options.find(option => option.value === value) ?? options[0] ?? null,
        [options, value],
    );

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const onPointerDown = (event: MouseEvent | PointerEvent) => {
            if (!selectRef.current) {
                return;
            }

            if (selectRef.current.contains(event.target as Node)) {
                return;
            }

            setIsOpen(false);
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isOpen]);

    return (
        <div className={styles.settingsSelect} ref={selectRef}>
            <button
                id={id}
                type="button"
                className={styles.settingsSelectButton}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(prev => !prev)}
            >
                <span className={styles.settingsSelectValue}>
                    {selectedOption?.icon ? (
                        <span className={styles.settingsSelectIcon}>{selectedOption.icon}</span>
                    ) : null}
                    <span className={styles.settingsSelectLabel}>{selectedOption?.label ?? ''}</span>
                </span>
                <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    focusable="false"
                    className={styles.settingsSelectChevron}
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </button>
            {isOpen ? (
                <div
                    className={styles.settingsSelectMenu}
                    role="listbox"
                    aria-labelledby={id}
                >
                    {options.map(option => (
                        <button
                            key={String(option.value)}
                            type="button"
                            role="option"
                            aria-selected={option.value === value}
                            className={option.value === value ? styles.settingsSelectItemActive : styles.settingsSelectItem}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                        >
                            <span className={styles.settingsSelectItemValue}>
                                {option.icon ? (
                                    <span className={styles.settingsSelectIcon}>{option.icon}</span>
                                ) : null}
                                <span className={styles.settingsSelectItemLabel}>{option.label}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}
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
    const hydratedSettingsScriptIdRef = useRef<string | null>(null);
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
        hydratedSettingsScriptIdRef.current = null;
        setScriptSettingsDraft({});
    }, [currentScriptId]);

    useEffect(() => {
        if (!currentScriptId || scriptSettingsOverride === undefined) {
            return;
        }

        if (hydratedSettingsScriptIdRef.current === currentScriptId) {
            return;
        }

        setScriptSettingsDraft(normalizeSettingsOverride(scriptSettingsOverride ?? {}));
        hydratedSettingsScriptIdRef.current = currentScriptId;
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

    const renderSettingsPanel = useCallback((panelId: string) => {
        if (isElementSettingsPanelId(panelId)) {
            const blockType = getBlockTypeFromElementPanelId(panelId);

            if (!blockType) {
                return null;
            }

            const blockDefaults = DEFAULT_EDITOR_SETTINGS.blocks[blockType];
            const blockSettings = resolvedScriptSettings.blocks[blockType];
            const blockLabel = blockLabelByType.get(blockType) ?? 'Element';
            const pageWidthPx = resolvedScriptSettings.page.widthPx ?? DEFAULT_EDITOR_SETTINGS.page.widthPx;
            const pageMarginLeftPx = resolvedScriptSettings.page.marginLeftPx ?? DEFAULT_EDITOR_SETTINGS.page.marginLeftPx;
            const pageMarginRightPx = resolvedScriptSettings.page.marginRightPx ?? DEFAULT_EDITOR_SETTINGS.page.marginRightPx;
            const typographyFontSizePx = resolvedScriptSettings.typography.fontSizePx
                ?? DEFAULT_EDITOR_SETTINGS.typography.fontSizePx;
            const fallbackTypographyLineHeight = resolvedScriptSettings.typography.lineHeight
                ?? DEFAULT_EDITOR_SETTINGS.typography.lineHeight;
            const previewReferenceChars = Math.max(
                MIN_PREVIEW_CONTENT_CHARS,
                Math.round(
                    Math.max(0, (pageWidthPx - pageMarginLeftPx - pageMarginRightPx) / 96) * SCREENPLAY_CHARS_PER_INCH,
                ),
            );
            const defaultContentChars = Math.max(
                1,
                previewReferenceChars - (blockDefaults.indentLeftChars ?? 0) - (blockDefaults.indentRightChars ?? 0),
            );
            const minPreviewContentChars = Math.min(MIN_PREVIEW_CONTENT_CHARS, defaultContentChars);
            const spacingBefore = getClosestStepValue(
                SPACING_BEFORE_OPTIONS,
                blockSettings.spacingBeforeEm ?? blockDefaults.spacingBeforeEm ?? 0,
            );
            const lineHeight = getClosestStepValue(
                LINE_HEIGHT_OPTIONS,
                blockSettings.lineHeight ?? blockDefaults.lineHeight ?? fallbackTypographyLineHeight,
            );
            const leftIndent = blockSettings.indentLeftChars ?? blockDefaults.indentLeftChars ?? 0;
            const rightIndent = blockSettings.indentRightChars ?? blockDefaults.indentRightChars ?? 0;
            const shortcut = blockSettings.shortcut ?? blockDefaults.shortcut ?? BLOCK_SHORTCUT_OPTIONS[0];
            const nextElement = blockSettings.nextElement ?? blockDefaults.nextElement ?? blockType;
            const textAlign = blockSettings.textAlign ?? blockDefaults.textAlign ?? BLOCK_TEXT_ALIGN_OPTIONS[0];
            const casing = blockSettings.casing ?? blockDefaults.casing ?? BLOCK_CASING_OPTIONS[0];
            const isBold = blockSettings.isBold ?? blockDefaults.isBold ?? false;
            const isItalic = blockSettings.isItalic ?? blockDefaults.isItalic ?? false;
            const isUnderline = blockSettings.isUnderline ?? blockDefaults.isUnderline ?? false;
            const previewText = BLOCK_PREVIEW_TEXT[blockType];
            const previewTextOffsetChars = blockType === ELEMENT_PARENTHETICAL ? 1 : 0;
            const spacingBeforeOptions: SettingsSelectOption[] = SPACING_BEFORE_OPTIONS.map(option => ({
                value: option,
                label: formatLines(option),
            }));
            const lineHeightOptions: SettingsSelectOption[] = LINE_HEIGHT_OPTIONS.map(option => ({
                value: option,
                label: formatNumeric(option),
            }));
            const shortcutOptions: SettingsSelectOption[] = BLOCK_SHORTCUT_OPTIONS.map(option => ({
                value: option,
                label: option,
            }));
            const nextElementOptions: SettingsSelectOption[] = SCRIPT_SETTINGS_ELEMENT_BLOCK_ITEMS.map(item => ({
                value: item.blockType,
                label: item.label,
                icon: BLOCK_ICONS[item.blockType],
            }));
            const normalizedLeftIndent = clamp(
                Math.round(leftIndent),
                0,
                MAX_INDENT_CHARS,
            );
            const normalizedRightIndent = clamp(
                Math.round(rightIndent),
                0,
                MAX_INDENT_CHARS,
            );
            const defaultSliderStartChars = 0;
            const defaultSliderEndChars = previewReferenceChars;
            const currentEndChars = previewReferenceChars - normalizedRightIndent;
            const initialSliderStart = clamp(
                normalizedLeftIndent,
                defaultSliderStartChars,
                defaultSliderEndChars - minPreviewContentChars,
            );
            const initialSliderEnd = clamp(
                currentEndChars,
                defaultSliderStartChars + minPreviewContentChars,
                defaultSliderEndChars,
            );
            const sliderStart = clamp(
                initialSliderStart,
                defaultSliderStartChars,
                initialSliderEnd - minPreviewContentChars,
            );
            const sliderEnd = clamp(
                initialSliderEnd,
                sliderStart + minPreviewContentChars,
                defaultSliderEndChars,
            );
            const contentChars = Math.max(minPreviewContentChars, sliderEnd - sliderStart);
            const leftTotalInches = (pageMarginLeftPx / 96) + (sliderStart / SCREENPLAY_CHARS_PER_INCH);
            const rightTotalInches = (pageMarginRightPx / 96)
                + ((previewReferenceChars - sliderEnd) / SCREENPLAY_CHARS_PER_INCH);
            const safePageWidthPx = Math.max(1, pageWidthPx);
            const pageStartPercent = clamp((pageMarginLeftPx / safePageWidthPx) * 100, 0, 45);
            const pageEndPercent = clamp(100 - ((pageMarginRightPx / safePageWidthPx) * 100), 55, 100);
            const pageContentPercent = Math.max(8, pageEndPercent - pageStartPercent);
            const lineStartPercent = pageStartPercent + ((sliderStart / previewReferenceChars) * pageContentPercent);
            const lineEndPercent = pageStartPercent + ((sliderEnd / previewReferenceChars) * pageContentPercent);
            const previewStyle = {
                '--preview-spacing-before': `${Math.max(0, spacingBefore) * typographyFontSizePx}px`,
                '--preview-spacing-line-unit': `${typographyFontSizePx}px`,
                '--preview-line-height': String(lineHeight),
                '--preview-line-box-height': `${typographyFontSizePx}px`,
                '--preview-font-size': `${typographyFontSizePx}px`,
                '--preview-line-start-percent': `${lineStartPercent}%`,
                '--preview-line-width': `${Math.max(6, lineEndPercent - lineStartPercent)}%`,
                '--preview-slider-zone-start-percent': `${pageStartPercent}%`,
                '--preview-slider-zone-end-percent': `${pageEndPercent}%`,
                '--preview-indent-start-percent': `${lineStartPercent}%`,
                '--preview-indent-end-percent': `${lineEndPercent}%`,
                '--preview-indent-default-start-percent': `${pageStartPercent}%`,
                '--preview-indent-default-end-percent': `${pageEndPercent}%`,
                '--preview-text-align': textAlign,
                '--preview-text-transform': casing === 'uppercase' ? 'uppercase' : 'none',
                '--preview-font-weight': isBold ? '700' : '400',
                '--preview-font-style': isItalic ? 'italic' : 'normal',
                '--preview-text-decoration': isUnderline ? 'underline' : 'none',
                '--preview-text-offset-ch': String(previewTextOffsetChars),
            } as CSSProperties;

            return (
                <div className={styles.panelStack}>
                    <h3 className={styles.panelTitle}>{blockLabel}</h3>
                    <div className={styles.previewCard} style={previewStyle}>
                        <div className={styles.previewToolbar}>
                            <div className={styles.toolbarGroup}>
                                {BLOCK_TEXT_ALIGN_OPTIONS.map(option => (
                                    <button
                                        key={option}
                                        type="button"
                                        className={option === textAlign ? styles.toolbarButtonActive : styles.toolbarButton}
                                        onClick={() => {
                                            updateBlockSettings(blockType, {
                                                textAlign: option,
                                            });
                                        }}
                                        aria-label={`${option} align`}
                                    >
                                        <span
                                            className={`${styles.alignGlyph} ${
                                                option === 'left'
                                                    ? styles.alignGlyphLeft
                                                    : option === 'center'
                                                        ? styles.alignGlyphCenter
                                                        : styles.alignGlyphRight
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className={styles.toolbarGroup}>
                                <button
                                    type="button"
                                    className={casing === 'normal' ? styles.toolbarButtonActive : styles.toolbarButton}
                                    onClick={() => {
                                        updateBlockSettings(blockType, {
                                            casing: 'normal',
                                        });
                                    }}
                                    aria-label="Normal casing"
                                >
                                    <span className={styles.textIcon}>Aa</span>
                                </button>
                                <button
                                    type="button"
                                    className={casing === 'uppercase' ? styles.toolbarButtonActive : styles.toolbarButton}
                                    onClick={() => {
                                        updateBlockSettings(blockType, {
                                            casing: 'uppercase',
                                        });
                                    }}
                                    aria-label="Uppercase casing"
                                >
                                    <span className={styles.textIcon}>AA</span>
                                </button>
                            </div>
                            <div className={styles.toolbarGroup}>
                                <button
                                    type="button"
                                    className={isBold ? styles.toolbarButtonActive : styles.toolbarButton}
                                    onClick={() => updateBlockSettings(blockType, {isBold: !isBold})}
                                    aria-label="Bold"
                                >
                                    <span className={styles.textIcon}>B</span>
                                </button>
                                <button
                                    type="button"
                                    className={isItalic ? styles.toolbarButtonActive : styles.toolbarButton}
                                    onClick={() => updateBlockSettings(blockType, {isItalic: !isItalic})}
                                    aria-label="Italic"
                                >
                                    <span className={`${styles.textIcon} ${styles.textIconItalic}`}>I</span>
                                </button>
                                <button
                                    type="button"
                                    className={isUnderline ? styles.toolbarButtonActive : styles.toolbarButton}
                                    onClick={() => updateBlockSettings(blockType, {isUnderline: !isUnderline})}
                                    aria-label="Underline"
                                >
                                    <span className={`${styles.textIcon} ${styles.textIconUnderline}`}>U</span>
                                </button>
                            </div>
                        </div>
                        <div className={styles.previewSpacingRow} />
                        <div className={styles.previewLineCanvas}>
                            <div className={styles.previewLineInner}>
                                <span className={styles.previewLineText}>{previewText}</span>
                            </div>
                        </div>
                        <div className={styles.indentSliderTrack}>
                            <span className={styles.indentSliderBase} />
                            <span className={styles.indentSliderMiddleBase} />
                            <span className={styles.indentSliderSelected} />
                            <span className={styles.indentSliderDefaultStart} />
                            <span className={styles.indentSliderDefaultEnd} />
                            <input
                                type="range"
                                className={`${styles.indentSliderInput} ${styles.indentSliderInputStart}`}
                                min={0}
                                max={previewReferenceChars}
                                step={1}
                                value={sliderStart}
                                onChange={event => {
                                    const rawStart = Number.parseInt(event.target.value, 10);
                                    const maxStart = Math.max(
                                        defaultSliderStartChars,
                                        sliderEnd - minPreviewContentChars,
                                    );
                                    const nextStart = clamp(rawStart, defaultSliderStartChars, maxStart);

                                    updateBlockSettings(blockType, {
                                        indentLeftChars: nextStart,
                                    });
                                }}
                                aria-label="Block start indent"
                            />
                            <input
                                type="range"
                                className={`${styles.indentSliderInput} ${styles.indentSliderInputEnd}`}
                                min={0}
                                max={previewReferenceChars}
                                step={1}
                                value={sliderEnd}
                                onChange={event => {
                                    const rawEnd = Number.parseInt(event.target.value, 10);
                                    const minEnd = sliderStart + minPreviewContentChars;
                                    const nextEnd = clamp(rawEnd, minEnd, defaultSliderEndChars);

                                    updateBlockSettings(blockType, {
                                        indentRightChars: previewReferenceChars - nextEnd,
                                    });
                                }}
                                aria-label="Block end indent"
                            />
                        </div>
                        <div className={styles.indentSliderLabels}>
                            <span>{'Start: '}{formatInches(leftTotalInches)}</span>
                            <span>{formatNumeric(contentChars / SCREENPLAY_CHARS_PER_INCH)}&quot; / {contentChars} chars</span>
                            <span>{'End: '}{formatInches(rightTotalInches)}</span>
                        </div>
                    </div>
                    <div className={styles.settingsFlatGrid}>
                        <div className={styles.settingsField}>
                            <span className={styles.fieldLabel}>Spacing before</span>
                            <SettingsSelect
                                id="settings-spacing-before"
                                ariaLabel="Select spacing before"
                                value={spacingBefore}
                                options={spacingBeforeOptions}
                                onChange={nextValue => {
                                    updateBlockSettings(blockType, {
                                        spacingBeforeEm: Number(nextValue),
                                    });
                                }}
                            />
                        </div>
                        <div className={styles.settingsField}>
                            <span className={styles.fieldLabel}>Line height</span>
                            <SettingsSelect
                                id="settings-line-height"
                                ariaLabel="Select line height"
                                value={lineHeight}
                                options={lineHeightOptions}
                                onChange={nextValue => {
                                    updateBlockSettings(blockType, {
                                        lineHeight: Number(nextValue),
                                    });
                                }}
                            />
                        </div>
                        <div className={styles.settingsField}>
                            <span className={styles.fieldLabel}>Shortcut</span>
                            <div className={styles.shortcutField}>
                                <span className={styles.shortcutPrefix}>{shortcutPrefix} +</span>
                                <SettingsSelect
                                    ariaLabel="Select block shortcut"
                                    value={shortcut}
                                    options={shortcutOptions}
                                    onChange={nextValue => {
                                        updateBlockSettings(blockType, {
                                            shortcut: nextValue as typeof shortcut,
                                        });
                                    }}
                                />
                            </div>
                        </div>
                        <div className={styles.settingsField}>
                            <span className={styles.fieldLabel}>Next element</span>
                            <SettingsSelect
                                id="settings-next-element"
                                ariaLabel="Select next element"
                                value={nextElement}
                                options={nextElementOptions}
                                onChange={nextValue => {
                                    updateBlockSettings(blockType, {
                                        nextElement: nextValue as FountainElementType,
                                    });
                                }}
                            />
                        </div>
                    </div>
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
