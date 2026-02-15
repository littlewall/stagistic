import {clampCharacterColorSaturation} from '@stagistic/script-core';
import type {
    CharacterCountItem as EditorSidebarCharacter,
    CharacterGenderOption,
} from '@stagistic/script-core';
import {
    NavArrowDown,
    NavArrowRight,
} from 'iconoir-react';
import {
    Button,
    ColorSlider,
    ColorSwatch,
    ColorThumb,
    Dialog,
    DialogTrigger,
    Input,
    ListBox,
    ListBoxItem,
    Popover,
    SliderTrack,
    Tooltip,
    TooltipTrigger,
    parseColor,
} from 'react-aria-components';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import styles from './EditorSidebar.module.css';
import {isInlineInteractiveTarget} from './utils';

type CharacterRowConfirmedProps = {
    character: EditorSidebarCharacter,
    characterIdentityKey: string,
    isExpanded: boolean,
    isDeletePending: boolean,
    isRenamePending: boolean,
    renameDraft: string,
    onToggleExpanded: (key: string) => void,
    onRenameDraftChange: (characterId: string, characterKey: string, value: string) => void,
    onCommitRenameDraft: (characterId: string, characterKey: string) => void,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
    onRenameCharacter?: (
        characterId: string,
        previousCharacterName: string,
        nextCharacterName: string,
    ) => void | Promise<void>,
    characterGenderOptions: CharacterGenderOption[],
    onSetCharacterColor?: (characterId: string, colorHex: string | null) => void,
    onSetCharacterGender?: (characterId: string, genderKey: string | null) => void,
    onUpsertCharacterGender?: (label: string) => Promise<CharacterGenderOption | null>,
    characterColorSaturation?: number,
};

const DEFAULT_COLOR_HEX = '#A8D4C7';
const DEFAULT_GENDER_LABEL = 'unspecified';
const UNSPECIFIED_GENDER_KEY = '__unspecified__';
const UNSPECIFIED_GENDER_LABEL = 'unspecified';
const PASTEL_LIGHTNESS = 78;
const PRESET_COLOR_HUES = [
    12,
    36,
    72,
    108,
    162,
    210,
    264,
    324,
];

type CharacterGenderIcon = 'male' | 'female' | 'neutral';
type GenderListOption = CharacterGenderOption & {
    isUnspecified?: boolean,
};

const getPickerColorValue = (hexColor: string, saturationPercent: number) => {
    try {
        const hsl = parseColor(hexColor).toFormat('hsl');

        return hsl
            .withChannelValue('saturation', saturationPercent)
            .withChannelValue('lightness', PASTEL_LIGHTNESS);
    } catch {
        return parseColor(DEFAULT_COLOR_HEX).toFormat('hsl');
    }
};

const getPastelHueFromHex = (hexColor: string, saturationPercent: number) => {
    return getPickerColorValue(hexColor, saturationPercent).getChannelValue('hue');
};

const getPastelHexFromHue = (hueValue: number, saturationPercent: number) => {
    const normalizedHue = Math.max(0, Math.min(359.99, hueValue));
    const pastelColor = parseColor(`hsl(${normalizedHue}, ${saturationPercent}%, ${PASTEL_LIGHTNESS}%)`);

    return normalizeHexColor(pastelColor.toString('hex')) ?? DEFAULT_COLOR_HEX;
};

const normalizeHexColor = (value: string | null | undefined) => {
    if (!value) {
        return null;
    }

    const trimmed = value.trim();

    if (/^#[\da-f]{6}$/iu.test(trimmed)) {
        return trimmed.toUpperCase();
    }

    const shortHexMatch = trimmed.match(/^#([\da-f])([\da-f])([\da-f])$/iu);

    if (!shortHexMatch) {
        return null;
    }

    return `#${shortHexMatch[1]}${shortHexMatch[1]}${shortHexMatch[2]}${shortHexMatch[2]}${shortHexMatch[3]}${shortHexMatch[3]}`
        .toUpperCase();
};

const normalizeGenderLabel = (value: string) => value
    .replace(/\s+/gu, ' ')
    .trim();

const normalizeGenderDisplayLabel = (value: string) => {
    const normalized = normalizeGenderLabel(value);

    if (normalized.length === 0) {
        return '';
    }

    return `${normalized.slice(0, 1).toLocaleLowerCase()}${normalized.slice(1)}`;
};

const normalizeGenderKey = (value: string) => normalizeGenderLabel(value).toLocaleLowerCase();

const getCharacterGenderIcon = (option: CharacterGenderOption | null): CharacterGenderIcon => {
    if (!option) {
        return 'neutral';
    }

    const normalizedKey = normalizeGenderKey(option.key);
    const normalizedLabel = normalizeGenderKey(option.label);

    if (normalizedKey === 'male' || normalizedLabel === 'male') {
        return 'male';
    }

    if (normalizedKey === 'female' || normalizedLabel === 'female') {
        return 'female';
    }

    return 'neutral';
};

const getDeleteTooltipLabel = (
    characterKey: string,
    isDeletePending: boolean,
    onDeleteCharacter?: (characterId: string) => void | Promise<void>,
) => {
    if (isDeletePending) {
        return `Deleting ${characterKey}`;
    }

    if (!onDeleteCharacter) {
        return 'Deletion unavailable';
    }

    return `Delete ${characterKey}`;
};

export const CharacterRowConfirmed = ({
    character,
    characterIdentityKey,
    isExpanded,
    isDeletePending,
    isRenamePending,
    renameDraft,
    onToggleExpanded,
    onRenameDraftChange,
    onCommitRenameDraft,
    onDeleteCharacter,
    onRenameCharacter,
    characterGenderOptions,
    onSetCharacterColor,
    onSetCharacterGender,
    onUpsertCharacterGender,
    characterColorSaturation,
}: CharacterRowConfirmedProps) => {
    const isGenderUpdatePending = character.isGenderUpdatePending ?? false;
    const isDeleteActionDisabled = isDeletePending
        || isRenamePending
        || !character.id
        || !onDeleteCharacter;
    const isRenameActionDisabled = isRenamePending
        || isDeletePending
        || !character.id
        || !onRenameCharacter;
    const isColorActionDisabled = isDeletePending
        || isRenamePending
        || !character.id
        || !onSetCharacterColor;
    const isGenderActionDisabled = isDeletePending
        || isRenamePending
        || !character.id
        || !onSetCharacterGender;
    const deleteTooltipLabel = getDeleteTooltipLabel(
        character.key,
        isDeletePending,
        onDeleteCharacter,
    );
    const resolvedColorSaturation = clampCharacterColorSaturation(characterColorSaturation);
    const currentCharacterColorHex = normalizeHexColor(character.colorHex ?? character.color)
        ?? DEFAULT_COLOR_HEX;
    const colorTriggerRef = useRef<HTMLSpanElement | null>(null);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [colorDraftHue, setColorDraftHue] = useState(
        getPastelHueFromHex(currentCharacterColorHex, resolvedColorSaturation),
    );
    const colorDraftHex = useMemo(
        () => getPastelHexFromHue(colorDraftHue, resolvedColorSaturation),
        [colorDraftHue, resolvedColorSaturation],
    );
    const pickerColorValue = useMemo(
        () => getPickerColorValue(colorDraftHex, resolvedColorSaturation),
        [colorDraftHex, resolvedColorSaturation],
    );
    const presetColorHexes = useMemo(
        () => PRESET_COLOR_HUES.map(hue => getPastelHexFromHue(hue, resolvedColorSaturation)),
        [resolvedColorSaturation],
    );
    const [optimisticGenderKey, setOptimisticGenderKey] = useState<string | null | undefined>(undefined);
    const effectiveGenderKey = optimisticGenderKey === undefined
        ? (character.genderKey ?? null)
        : optimisticGenderKey;
    const selectedGenderOption = useMemo(() => {
        if (!effectiveGenderKey) {
            return null;
        }

        return characterGenderOptions.find(option => option.key === effectiveGenderKey) ?? null;
    }, [characterGenderOptions, effectiveGenderKey]);
    const selectedGenderLabel = useMemo(
        () => selectedGenderOption
            ? normalizeGenderDisplayLabel(selectedGenderOption.label)
            : DEFAULT_GENDER_LABEL,
        [selectedGenderOption],
    );
    const [genderQuery, setGenderQuery] = useState('');
    const [isGenderPickerOpen, setIsGenderPickerOpen] = useState(false);
    const selectedGenderIcon = useMemo(
        () => getCharacterGenderIcon(selectedGenderOption),
        [selectedGenderOption],
    );
    const isCommittingGenderRef = useRef(false);

    useEffect(() => {
        if (isColorPickerOpen) {
            return;
        }

        setColorDraftHue(getPastelHueFromHex(currentCharacterColorHex, resolvedColorSaturation));
    }, [
        currentCharacterColorHex,
        isColorPickerOpen,
        resolvedColorSaturation,
    ]);

    useEffect(() => {
        if (!isColorPickerOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target;

            if (!(target instanceof Node)) {
                return;
            }

            const targetElement = target instanceof HTMLElement
                ? target
                : target.parentElement;

            if (!targetElement) {
                return;
            }

            const isInsideColorPopover = Boolean(targetElement.closest(`.${styles.characterColorPopover}`));
            const isColorTriggerTarget = Boolean(colorTriggerRef.current?.contains(targetElement));

            if (isInsideColorPopover || isColorTriggerTarget) {
                return;
            }

            setIsColorPickerOpen(false);
        };

        document.addEventListener('pointerdown', handlePointerDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [isColorPickerOpen]);

    useEffect(() => {
        if (optimisticGenderKey === undefined) {
            return;
        }

        if ((character.genderKey ?? null) === optimisticGenderKey) {
            setOptimisticGenderKey(undefined);

            return;
        }

        if (!isGenderUpdatePending) {
            setOptimisticGenderKey(undefined);
        }
    }, [
        character.genderKey,
        isGenderUpdatePending,
        optimisticGenderKey,
    ]);

    const genderListOptions = useMemo<GenderListOption[]>(
        () => [
            {
                id: UNSPECIFIED_GENDER_KEY,
                key: UNSPECIFIED_GENDER_KEY,
                label: normalizeGenderDisplayLabel(UNSPECIFIED_GENDER_LABEL),
                isUnspecified: true,
            },
            ...characterGenderOptions.map(option => ({
                ...option,
                label: normalizeGenderDisplayLabel(option.label),
            })),
        ],
        [characterGenderOptions],
    );
    const normalizedGenderInputLabel = useMemo(
        () => normalizeGenderDisplayLabel(genderQuery),
        [genderQuery],
    );
    const normalizedGenderInputKey = useMemo(
        () => normalizeGenderKey(normalizedGenderInputLabel),
        [normalizedGenderInputLabel],
    );
    const existingGenderOption = useMemo(() => {
        if (normalizedGenderInputLabel.length === 0) {
            return null;
        }

        return characterGenderOptions.find(option => option.key === normalizedGenderInputKey) ?? null;
    }, [
        characterGenderOptions,
        normalizedGenderInputKey,
        normalizedGenderInputLabel,
    ]);
    const canCreateCustomGender = normalizedGenderInputLabel.length > 0
        && !existingGenderOption
        && Boolean(onUpsertCharacterGender);

    const applyGenderOption = (nextKey: string | null) => {
        if (!character.id || isGenderActionDisabled) {
            return;
        }

        setGenderQuery('');

        if (nextKey !== effectiveGenderKey) {
            setOptimisticGenderKey(nextKey);
            onSetCharacterGender?.(character.id, nextKey);
        }

        setIsGenderPickerOpen(false);
    };

    const shouldCloseGenderPopover = (target: Element) => {
        const isInsideGenderOverlay = Boolean(
            target.closest(`.${styles.characterGenderPickerDialog}`)
            || target.closest(`.${styles.characterGenderListBox}`)
            || target.closest(`.${styles.characterGenderQueryInput}`),
        );

        if (isInsideGenderOverlay) {
            return false;
        }

        setIsGenderPickerOpen(false);
        setGenderQuery('');

        return true;
    };

    const commitGenderQuery = async () => {
        if (isGenderActionDisabled || !character.id || isCommittingGenderRef.current) {
            return false;
        }

        const normalizedLabel = normalizedGenderInputLabel;

        if (normalizedLabel.length === 0) {
            return false;
        }

        if (!canCreateCustomGender || !onUpsertCharacterGender) {
            return false;
        }

        isCommittingGenderRef.current = true;

        try {
            const createdOption = await onUpsertCharacterGender(normalizedLabel);

            if (!createdOption) {
                return false;
            }

            applyGenderOption(createdOption.key);
            return true;
        } finally {
            isCommittingGenderRef.current = false;
        }
    };

    const handleGenderSelection = (nextKey: string) => {
        if (!character.id || isGenderActionDisabled) {
            return;
        }

        if (nextKey === UNSPECIFIED_GENDER_KEY) {
            setOptimisticGenderKey(null);
            onSetCharacterGender?.(character.id, null);
            setGenderQuery('');
            setIsGenderPickerOpen(false);

            return;
        }

        const selectedOption = characterGenderOptions.find(option => option.key === nextKey);

        if (!selectedOption) {
            return;
        }

        if (selectedOption.key === effectiveGenderKey) {
            setOptimisticGenderKey(null);
            onSetCharacterGender?.(character.id, null);
            setGenderQuery('');
            setIsGenderPickerOpen(false);

            return;
        }

        applyGenderOption(selectedOption.key);
    };

    const isCharacterOverlayTarget = (target: EventTarget | null) => {
        if (!(target instanceof Node)) {
            return false;
        }

        const element = target instanceof HTMLElement
            ? target
            : target.parentElement;

        if (!element) {
            return false;
        }

        return Boolean(
            element.closest(`.${styles.characterColorPopover}`)
            || element.closest(`.${styles.characterGenderPickerPopover}`),
        );
    };

    return (
        <>
            <div
                className={styles.characterRowButton}
                role="button"
                tabIndex={0}
                aria-label={isExpanded ? `Collapse ${character.key}` : `Expand ${character.key}`}
                aria-expanded={isExpanded}
                onClick={event => {
                    if (isColorPickerOpen) {
                        return;
                    }

                    if (isInlineInteractiveTarget(event.target) || isCharacterOverlayTarget(event.target)) {
                        return;
                    }

                    onToggleExpanded(characterIdentityKey);
                }}
                onKeyDown={event => {
                    if (isColorPickerOpen) {
                        return;
                    }

                    if (
                        isInlineInteractiveTarget(event.target)
                        || isCharacterOverlayTarget(event.target)
                        || (event.key !== 'Enter' && event.key !== ' ')
                    ) {
                        return;
                    }

                    event.preventDefault();
                    onToggleExpanded(characterIdentityKey);
                }}
            >
                <button
                    type="button"
                    className={styles.expandIndicatorButton}
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={event => {
                        event.stopPropagation();
                        onToggleExpanded(characterIdentityKey);
                    }}
                >
                    {isExpanded ? (
                        <NavArrowDown className={styles.expandIcon} aria-hidden="true" />
                    ) : (
                        <NavArrowRight className={styles.expandIcon} aria-hidden="true" />
                    )}
                </button>
                {isExpanded ? (
                    <>
                        <TooltipTrigger
                            trigger="hover"
                            delay={0}
                            closeDelay={120}
                        >
                            <span
                                ref={colorTriggerRef}
                                role="button"
                                tabIndex={isColorActionDisabled ? -1 : 0}
                                aria-label={`Choose color for ${character.key}`}
                                aria-disabled={isColorActionDisabled || undefined}
                                className={styles.characterColorInteractive}
                                onClick={event => {
                                    event.stopPropagation();

                                    if (isColorActionDisabled) {
                                        return;
                                    }

                                    setIsColorPickerOpen(previous => {
                                        const nextOpen = !previous;

                                        if (nextOpen) {
                                            setColorDraftHue(
                                                getPastelHueFromHex(currentCharacterColorHex, resolvedColorSaturation),
                                            );
                                        }

                                        return nextOpen;
                                    });
                                }}
                                onKeyDown={event => {
                                    event.stopPropagation();

                                    if (isColorActionDisabled) {
                                        return;
                                    }

                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        setIsColorPickerOpen(previous => {
                                            const nextOpen = !previous;

                                            if (nextOpen) {
                                                setColorDraftHue(
                                                    getPastelHueFromHex(currentCharacterColorHex, resolvedColorSaturation),
                                                );
                                            }

                                            return nextOpen;
                                        });
                                    }

                                    if (event.key === 'Escape') {
                                        event.preventDefault();
                                        setIsColorPickerOpen(false);
                                    }
                                }}
                            >
                                <span className={styles.characterColor} aria-hidden="true" />
                            </span>
                            <Tooltip
                                className={styles.confirmTooltip}
                                placement="right"
                                offset={8}
                            >
                                Choose color
                            </Tooltip>
                        </TooltipTrigger>
                        {isColorPickerOpen && colorTriggerRef.current ? (
                            <Popover
                                isOpen={isColorPickerOpen}
                                triggerRef={colorTriggerRef}
                                placement="bottom start"
                                offset={6}
                                className={styles.characterColorPopover}
                                shouldCloseOnInteractOutside={() => false}
                                onOpenChange={nextOpen => {
                                    setIsColorPickerOpen(nextOpen);
                                }}
                            >
                                <Dialog
                                    className={styles.characterColorDialog}
                                    aria-label={`Color picker for ${character.key}`}
                                >
                                    <div className={styles.characterColorPickerLayout}>
                                        <ColorSwatch
                                            color={colorDraftHex}
                                            className={styles.characterColorPreview}
                                            aria-label={`Preview color for ${character.key}`}
                                        />
                                        <ColorSlider
                                            colorSpace="hsl"
                                            channel="hue"
                                            value={pickerColorValue}
                                            onChange={value => {
                                                setColorDraftHue(value.getChannelValue('hue'));
                                            }}
                                            className={styles.characterColorSlider}
                                        >
                                            <SliderTrack className={styles.characterColorSliderTrack}>
                                                <ColorThumb className={styles.characterColorThumb} />
                                            </SliderTrack>
                                        </ColorSlider>
                                        <div className={styles.characterColorSwatches}>
                                            {presetColorHexes.map(presetColorHex => (
                                                <Button
                                                    key={presetColorHex}
                                                    className={styles.characterColorSwatch}
                                                    data-selected={presetColorHex === colorDraftHex || undefined}
                                                    aria-label={`Select color ${presetColorHex}`}
                                                    onPress={() => {
                                                        setColorDraftHue(
                                                            getPastelHueFromHex(presetColorHex, resolvedColorSaturation),
                                                        );
                                                    }}
                                                >
                                                    <ColorSwatch
                                                        color={presetColorHex}
                                                        className={styles.characterColorSwatchFill}
                                                    />
                                                </Button>
                                            ))}
                                        </div>
                                        <span className={styles.characterColorLabel}>{colorDraftHex}</span>
                                    </div>
                                    <div className={styles.characterColorActions}>
                                        <Button
                                            className={styles.characterColorActionButton}
                                            onPress={() => {
                                                if (isColorActionDisabled || !character.id) {
                                                    return;
                                                }

                                                const nextColorHex = normalizeHexColor(colorDraftHex)
                                                    ?? currentCharacterColorHex;

                                                onSetCharacterColor?.(character.id, nextColorHex);
                                                setIsColorPickerOpen(false);
                                            }}
                                        >
                                            Apply
                                        </Button>
                                        <Button
                                            className={styles.characterColorActionButtonSecondary}
                                            onPress={() => {
                                                if (isColorActionDisabled || !character.id) {
                                                    return;
                                                }

                                                onSetCharacterColor?.(character.id, null);
                                                setIsColorPickerOpen(false);
                                            }}
                                        >
                                            Reset
                                        </Button>
                                    </div>
                                </Dialog>
                            </Popover>
                        ) : null}
                    </>
                ) : (
                    <span className={styles.characterColor} aria-hidden="true" />
                )}
                {isExpanded ? (
                    <input
                        type="text"
                        className={styles.characterInlineRenameInput}
                        value={renameDraft}
                        disabled={isRenameActionDisabled}
                        aria-label={`Rename ${character.key}`}
                        onClick={event => {
                            event.stopPropagation();
                        }}
                        onChange={event => {
                            onRenameDraftChange(
                                character.id ?? '',
                                character.key,
                                event.target.value,
                            );
                        }}
                        onBlur={() => {
                            onCommitRenameDraft(character.id ?? '', character.key);
                        }}
                        onKeyDown={event => {
                            event.stopPropagation();

                            if (event.key === 'Enter') {
                                event.preventDefault();
                                onCommitRenameDraft(character.id ?? '', character.key);
                                event.currentTarget.blur();
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault();
                                onRenameDraftChange(
                                    character.id ?? '',
                                    character.key,
                                    character.key,
                                );
                                event.currentTarget.blur();
                            }
                        }}
                    />
                ) : (
                    <span className={styles.characterName}>{character.key}</span>
                )}
            </div>
            {isExpanded ? (
                <div className={styles.characterDetails}>
                    <div className={styles.characterMetaRow}>
                        <span className={styles.detailLabel}>Occurrences in script</span>
                        <span className={styles.detailValue}>{character.count}</span>
                    </div>
                    <div className={styles.characterCardFooter}>
                        <div className={styles.characterFooterLeft}>
                            <DialogTrigger
                                isOpen={isGenderPickerOpen}
                                onOpenChange={nextOpen => {
                                    setIsGenderPickerOpen(nextOpen);
                                    setGenderQuery('');
                                }}
                            >
                                <Button
                                    className={styles.genderIconButton}
                                    aria-label={`Set gender for ${character.key}. Current value: ${selectedGenderLabel}`}
                                    isDisabled={isGenderActionDisabled}
                                >
                                    {selectedGenderIcon === 'male' ? (
                                        <svg viewBox="0 0 24 24" className={styles.iconGlyph} aria-hidden="true">
                                            <path d="M10 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
                                            <path d="M14 5h5v5" />
                                            <path d="m13 11 6-6" />
                                        </svg>
                                    ) : null}
                                    {selectedGenderIcon === 'female' ? (
                                        <svg viewBox="0 0 24 24" className={styles.iconGlyph} aria-hidden="true">
                                            <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z" />
                                            <path d="M12 12v7" />
                                            <path d="M9 16h6" />
                                        </svg>
                                    ) : null}
                                    {selectedGenderIcon === 'neutral' ? (
                                        <svg viewBox="0 0 24 24" className={styles.iconGlyph} aria-hidden="true">
                                            <path d="M12 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6Z" />
                                            <path d="M7 20c1.5-2.2 3.2-3.3 5-3.3s3.5 1.1 5 3.3" />
                                        </svg>
                                    ) : null}
                                </Button>
                                <Popover
                                    placement="bottom start"
                                    offset={6}
                                    className={styles.characterGenderPickerPopover}
                                    shouldCloseOnInteractOutside={shouldCloseGenderPopover}
                                >
                                    <Dialog
                                        className={styles.characterGenderPickerDialog}
                                        aria-label={`Gender picker for ${character.key}`}
                                    >
                                        <span className={styles.characterGenderPickerHeading}>
                                            Gender
                                        </span>
                                        <Input
                                            className={styles.characterGenderQueryInput}
                                            value={genderQuery}
                                            placeholder="Add custom gender..."
                                            aria-label={`Add custom gender for ${character.key}`}
                                            onChange={event => {
                                                setGenderQuery(event.target.value);
                                            }}
                                            onKeyDown={event => {
                                                event.stopPropagation();

                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    void commitGenderQuery();
                                                }

                                                if (event.key === 'Escape') {
                                                    event.preventDefault();
                                                    setGenderQuery('');
                                                    setIsGenderPickerOpen(false);
                                                }
                                            }}
                                        />
                                        <span className={styles.characterGenderHint}>
                                            Enter to add custom gender
                                        </span>
                                        <ListBox<GenderListOption>
                                            className={styles.characterGenderListBox}
                                            items={genderListOptions}
                                            selectedKeys={[
                                                effectiveGenderKey ?? UNSPECIFIED_GENDER_KEY,
                                            ]}
                                            selectionMode="single"
                                            onAction={key => {
                                                handleGenderSelection(String(key));
                                            }}
                                            onSelectionChange={selection => {
                                                if (selection === 'all') {
                                                    return;
                                                }

                                                const [selectedKey] = Array.from(selection);

                                                if (!selectedKey) {
                                                    return;
                                                }

                                                handleGenderSelection(String(selectedKey));
                                            }}
                                        >
                                            {(item: GenderListOption) => (
                                                <ListBoxItem
                                                    id={item.key}
                                                    textValue={item.label}
                                                    className={styles.characterGenderOption}
                                                >
                                                    {(item.key === effectiveGenderKey)
                                                        || (item.isUnspecified && !effectiveGenderKey) ? (
                                                        <span className={styles.characterGenderCheckmark} aria-hidden="true">
                                                            <svg viewBox="0 0 24 24" className={styles.iconGlyph}>
                                                                <path d="m5 12 4 4L19 6" />
                                                            </svg>
                                                        </span>
                                                    ) : (
                                                        <span className={styles.characterGenderCheckmark} aria-hidden="true" />
                                                    )}
                                                    <span>{item.label}</span>
                                                </ListBoxItem>
                                            )}
                                        </ListBox>
                                        {canCreateCustomGender ? (
                                            <Button
                                                className={styles.characterGenderCreateButton}
                                                onPress={() => {
                                                    void commitGenderQuery();
                                                }}
                                            >
                                                Add "{normalizedGenderInputLabel}"
                                            </Button>
                                        ) : null}
                                    </Dialog>
                                </Popover>
                            </DialogTrigger>
                        </div>
                        <div className={styles.characterFooterRight}>
                            <TooltipTrigger
                                trigger="hover"
                                delay={0}
                                closeDelay={120}
                            >
                                <Button
                                    className={styles.deleteIconButton}
                                    aria-disabled={isDeleteActionDisabled}
                                    aria-label={isDeletePending ? `Deleting ${character.key}` : `Delete ${character.key}`}
                                    onPress={() => {
                                        if (isDeleteActionDisabled) {
                                            return;
                                        }

                                        void onDeleteCharacter?.(character.id ?? '');
                                    }}
                                >
                                    {isDeletePending ? (
                                        <span className={styles.confirmSpinner} aria-hidden="true" />
                                    ) : (
                                        <svg viewBox="0 0 24 24" className={styles.iconGlyph}>
                                            <path d="M4 7h16" />
                                            <path d="M10 11v6" />
                                            <path d="M14 11v6" />
                                            <path d="M6 7v11a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
                                            <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                        </svg>
                                    )}
                                </Button>
                                <Tooltip
                                    className={styles.confirmTooltip}
                                    placement="right"
                                    offset={8}
                                >
                                    {deleteTooltipLabel}
                                </Tooltip>
                            </TooltipTrigger>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
};
