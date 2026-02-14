import {useScriptRepository} from '@stagistic/app-core';
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
    extractCharacterKeys,
    type FountainElementType,
    normalizeCharacterKey,
    splitCharacterTokens,
} from '@stagistic/editor-core';
import {
    BLOCK_ICONS,
    FountainEditor,
    getCharacterColor,
} from '@stagistic/editor-ui';
import {
    BLOCK_CASING_OPTIONS,
    BLOCK_SHORTCUT_OPTIONS,
    BLOCK_TEXT_ALIGN_OPTIONS,
    DEFAULT_EDITOR_SETTINGS,
    type EditorSettings,
    type EditorSettingsOverride,
    FOUNTAIN_BLOCK_NODE_NAME,
    type FountainJSONContent,
    mergeEditorSettings,
    type ScriptDocument,
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

const BLOCK_PREVIEW_TEXT_COLOR: Record<FountainElementType, string> = {
    [ELEMENT_SCENE_HEADING]: 'var(--color-block-scene-heading)',
    [ELEMENT_ACTION]: 'var(--color-block-action)',
    [ELEMENT_CHARACTER]: 'var(--color-block-character)',
    [ELEMENT_DUAL_DIALOGUE_CHARACTER]: 'var(--color-block-dual-character)',
    [ELEMENT_DUAL_DIALOGUE]: 'var(--color-block-dual-dialogue)',
    [ELEMENT_PARENTHETICAL]: 'var(--color-block-parenthetical)',
    [ELEMENT_DIALOGUE]: 'var(--color-block-dialogue)',
    [ELEMENT_TRANSITION]: 'var(--color-block-transition)',
    [ELEMENT_LYRICS]: 'var(--color-block-lyrics)',
    [ELEMENT_CENTERED]: 'var(--color-block-centered)',
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

const SETTINGS_BLOCK_TYPE_SET = new Set<FountainElementType>([
    ELEMENT_SCENE_HEADING,
    ELEMENT_ACTION,
    ELEMENT_CHARACTER,
    ELEMENT_DUAL_DIALOGUE_CHARACTER,
    ELEMENT_PARENTHETICAL,
    ELEMENT_DIALOGUE,
    ELEMENT_DUAL_DIALOGUE,
    ELEMENT_TRANSITION,
    ELEMENT_LYRICS,
    ELEMENT_CENTERED,
]);

const normalizeSettingsBlockType = (value: unknown): FountainElementType | null => {
    if (value === 'fountain_lyric' || value === 'lyrics') {
        return ELEMENT_LYRICS;
    }

    if (value === ELEMENT_DUAL_DIALOGUE) {
        return ELEMENT_DIALOGUE;
    }

    return typeof value === 'string' && SETTINGS_BLOCK_TYPE_SET.has(value as FountainElementType)
        ? value as FountainElementType
        : null;
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

type BlockSettingsPatch = Partial<EditorSettings['blocks'][FountainElementType]>;

type CharacterCountItem = {
    id?: string,
    key: string,
    count: number,
    color: string,
    isConfirmed: boolean,
    isPending?: boolean,
    isConfirmPending?: boolean,
    isDeletePending?: boolean,
    isRenamePending?: boolean,
};

type ScriptCharacterRecord = {
    id: string,
    key: string,
};

type CharacterRefByKey = Record<string, string>;

type ScriptCharacterStats = {
    countsByKey: Map<string, number>,
    confirmedCountsById: Map<string, number>,
    unconfirmedCountsByKey: Map<string, number>,
};

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

const isCharacterBlockType = (value: unknown) => {
    return value === ELEMENT_CHARACTER || value === ELEMENT_DUAL_DIALOGUE_CHARACTER;
};

const getNodeTextContent = (node: FountainJSONContent): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.map(getNodeTextContent).join('');
};

const splitCharacterBaseAndSuffix = (value: string) => {
    const trimmed = value.trim();
    const suffixMatch = trimmed.match(/\s*(\([^()]*\)\s*)+$/);

    if (!suffixMatch) {
        return {
            base: trimmed,
            suffix: '',
        };
    }

    const suffix = suffixMatch[0].trim();
    const base = trimmed.slice(0, trimmed.length - suffixMatch[0].length).trim();

    return {
        base,
        suffix,
    };
};

const normalizeCharacterDisplayName = (value: string) => value
    .replace(/\s+/g, ' ')
    .trim();

const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

const getCharacterRefByKey = (attrs: Record<string, unknown> | undefined): CharacterRefByKey => {
    if (!attrs || !isObjectRecord(attrs.characterRefs)) {
        return {};
    }

    const characterRefs: CharacterRefByKey = {};

    Object.entries(attrs.characterRefs).forEach(([rawKey, rawCharacterId]) => {
        if (typeof rawCharacterId !== 'string' || rawCharacterId.length === 0) {
            return;
        }

        const key = normalizeCharacterKey(rawKey);

        if (key.length === 0) {
            return;
        }

        characterRefs[key] = rawCharacterId;
    });

    return characterRefs;
};

const withCharacterRefByKey = (node: FountainJSONContent, characterRefByKey: CharacterRefByKey): FountainJSONContent => {
    const attrs = isObjectRecord(node.attrs) ? node.attrs : {};
    const nextAttrs = {
        ...attrs,
    };

    if (Object.keys(characterRefByKey).length === 0) {
        delete nextAttrs.characterRefs;
    } else {
        nextAttrs.characterRefs = characterRefByKey;
    }

    return {
        ...node,
        attrs: nextAttrs,
    };
};

const renameCharacterLine = (
    line: string,
    fromCharacterKey: string,
    toCharacterName: string,
    characterRefByKey: CharacterRefByKey,
    characterId?: string,
) => {
    const tokens = splitCharacterTokens(line);
    let didRename = false;
    const normalizedSourceKey = normalizeCharacterKey(fromCharacterKey);
    const normalizedTargetName = normalizeCharacterDisplayName(toCharacterName);
    const normalizedTargetKey = normalizeCharacterKey(normalizedTargetName);

    const renamedTokens = tokens.map(token => {
        const sourceValue = token.value.trim();
        const sourceKey = normalizeCharacterKey(sourceValue);
        const tokenCharacterId = characterRefByKey[sourceKey];
        const shouldRename = characterId
            ? tokenCharacterId === characterId
                || (!tokenCharacterId && sourceKey === normalizedSourceKey)
            : sourceKey === normalizedSourceKey;

        if (!shouldRename) {
            return {
                value: sourceValue,
                key: sourceKey,
            };
        }

        const {
            suffix,
        } = splitCharacterBaseAndSuffix(sourceValue);
        const nextValue = suffix.length > 0
            ? `${normalizedTargetName} ${suffix}`
            : normalizedTargetName;

        didRename = true;

        return {
            value: nextValue,
            key: normalizeCharacterKey(nextValue),
        };
    });

    if (!didRename) {
        return {
            line,
            changed: false,
            characterRefByKey,
        };
    }

    const dedupedValues: string[] = [];
    const dedupedKeys: string[] = [];
    const seen = new Set<string>();

    renamedTokens.forEach(token => {
        if (token.value.length === 0 || token.key.length === 0 || seen.has(token.key)) {
            return;
        }

        seen.add(token.key);
        dedupedValues.push(token.value);
        dedupedKeys.push(token.key);
    });

    const presentKeys = new Set(dedupedKeys);
    const nextCharacterRefByKey: CharacterRefByKey = {};

    Object.entries(characterRefByKey).forEach(([key, id]) => {
        if (!presentKeys.has(key)) {
            return;
        }

        if (characterId && id === characterId && key === normalizedSourceKey && key !== normalizedTargetKey) {
            return;
        }

        nextCharacterRefByKey[key] = id;
    });

    if (normalizedTargetKey.length > 0) {
        if (characterId) {
            nextCharacterRefByKey[normalizedTargetKey] = characterId;
        } else {
            const sourceCharacterId = characterRefByKey[normalizedSourceKey];

            if (sourceCharacterId) {
                nextCharacterRefByKey[normalizedTargetKey] = sourceCharacterId;
            }
        }
    }

    return {
        line: dedupedValues.join('+'),
        changed: true,
        characterRefByKey: nextCharacterRefByKey,
    };
};

const renameCharacterInScriptDocument = (
    value: ScriptDocument,
    fromCharacterKey: string,
    toCharacterName: string,
    getCharacterNameForBlockType: (name: string, blockType: unknown) => string,
    options?: {characterId?: string},
) => {
    const replaceNodes = (nodes: FountainJSONContent[] | undefined): {
        nodes: FountainJSONContent[] | undefined,
        changed: boolean,
    } => {
        if (!Array.isArray(nodes)) {
            return {
                nodes,
                changed: false,
            };
        }

        let didChange = false;
        const nextNodes = nodes.map(node => {
            if (!node || typeof node !== 'object') {
                return node;
            }

            if (node.type === FOUNTAIN_BLOCK_NODE_NAME && isCharacterBlockType(node.attrs?.blockType)) {
                const sourceLine = getNodeTextContent(node);
                const replacementName = getCharacterNameForBlockType(toCharacterName, node.attrs?.blockType);
                const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);
                const {
                    line: renamedLine,
                    changed: didRenameLine,
                    characterRefByKey: nextCharacterRefByKey,
                } = renameCharacterLine(
                    sourceLine,
                    fromCharacterKey,
                    replacementName,
                    sourceCharacterRefByKey,
                    options?.characterId,
                );

                if (!didRenameLine) {
                    return node;
                }

                didChange = true;

                return withCharacterRefByKey({
                    ...node,
                    content: renamedLine.length > 0
                        ? [{type: 'text', text: renamedLine}]
                        : [],
                }, nextCharacterRefByKey);
            }

            const {
                nodes: nextContent,
                changed: didChangeChildren,
            } = replaceNodes(node.content);

            if (!didChangeChildren) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: nextContent,
            };
        });

        return {
            nodes: didChange ? nextNodes : nodes,
            changed: didChange,
        };
    };

    const {
        nodes: nextContent,
        changed,
    } = replaceNodes(value.content);

    if (!changed || !nextContent) {
        return {
            value,
            changed: false,
        };
    }

    return {
        value: {
            ...value,
            content: nextContent,
        },
        changed: true,
    };
};

const linkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterKey: string,
    characterId: string,
) => {
    const normalizedCharacterKey = normalizeCharacterKey(characterKey);

    if (normalizedCharacterKey.length === 0 || characterId.length === 0) {
        return {
            value,
            changed: false,
        };
    }

    const replaceNodes = (nodes: FountainJSONContent[] | undefined): {
        nodes: FountainJSONContent[] | undefined,
        changed: boolean,
    } => {
        if (!Array.isArray(nodes)) {
            return {
                nodes,
                changed: false,
            };
        }

        let didChange = false;
        const nextNodes = nodes.map(node => {
            if (!node || typeof node !== 'object') {
                return node;
            }

            if (node.type === FOUNTAIN_BLOCK_NODE_NAME && isCharacterBlockType(node.attrs?.blockType)) {
                const text = getNodeTextContent(node);
                const keys = extractCharacterKeys(text);

                if (!keys.includes(normalizedCharacterKey)) {
                    return node;
                }

                const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);

                if (sourceCharacterRefByKey[normalizedCharacterKey] === characterId) {
                    return node;
                }

                didChange = true;

                return withCharacterRefByKey(node, {
                    ...sourceCharacterRefByKey,
                    [normalizedCharacterKey]: characterId,
                });
            }

            const {
                nodes: nextContent,
                changed: didChangeChildren,
            } = replaceNodes(node.content);

            if (!didChangeChildren) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: nextContent,
            };
        });

        return {
            nodes: didChange ? nextNodes : nodes,
            changed: didChange,
        };
    };

    const {
        nodes: nextContent,
        changed,
    } = replaceNodes(value.content);

    if (!changed || !nextContent) {
        return {
            value,
            changed: false,
        };
    }

    return {
        value: {
            ...value,
            content: nextContent,
        },
        changed: true,
    };
};

const unlinkCharacterRefInScriptDocument = (
    value: ScriptDocument,
    characterId: string,
) => {
    if (characterId.length === 0) {
        return {
            value,
            changed: false,
        };
    }

    const replaceNodes = (nodes: FountainJSONContent[] | undefined): {
        nodes: FountainJSONContent[] | undefined,
        changed: boolean,
    } => {
        if (!Array.isArray(nodes)) {
            return {
                nodes,
                changed: false,
            };
        }

        let didChange = false;
        const nextNodes = nodes.map(node => {
            if (!node || typeof node !== 'object') {
                return node;
            }

            if (node.type === FOUNTAIN_BLOCK_NODE_NAME && isCharacterBlockType(node.attrs?.blockType)) {
                const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);
                const nextCharacterRefByKey = Object.entries(sourceCharacterRefByKey).reduce<CharacterRefByKey>(
                    (acc, [key, id]) => {
                        if (id !== characterId) {
                            acc[key] = id;
                        }

                        return acc;
                    },
                    {},
                );

                if (Object.keys(nextCharacterRefByKey).length === Object.keys(sourceCharacterRefByKey).length) {
                    return node;
                }

                didChange = true;

                return withCharacterRefByKey(node, nextCharacterRefByKey);
            }

            const {
                nodes: nextContent,
                changed: didChangeChildren,
            } = replaceNodes(node.content);

            if (!didChangeChildren) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: nextContent,
            };
        });

        return {
            nodes: didChange ? nextNodes : nodes,
            changed: didChange,
        };
    };

    const {
        nodes: nextContent,
        changed,
    } = replaceNodes(value.content);

    if (!changed || !nextContent) {
        return {
            value,
            changed: false,
        };
    }

    return {
        value: {
            ...value,
            content: nextContent,
        },
        changed: true,
    };
};

const replaceCharacterRefIdInScriptDocument = (
    value: ScriptDocument,
    sourceCharacterId: string,
    targetCharacterId: string,
) => {
    if (
        sourceCharacterId.length === 0
        || targetCharacterId.length === 0
        || sourceCharacterId === targetCharacterId
    ) {
        return {
            value,
            changed: false,
        };
    }

    const replaceNodes = (nodes: FountainJSONContent[] | undefined): {
        nodes: FountainJSONContent[] | undefined,
        changed: boolean,
    } => {
        if (!Array.isArray(nodes)) {
            return {
                nodes,
                changed: false,
            };
        }

        let didChange = false;
        const nextNodes = nodes.map(node => {
            if (!node || typeof node !== 'object') {
                return node;
            }

            if (node.type === FOUNTAIN_BLOCK_NODE_NAME && isCharacterBlockType(node.attrs?.blockType)) {
                const sourceCharacterRefByKey = getCharacterRefByKey(node.attrs);
                let changedCharacterRef = false;
                const nextCharacterRefByKey = Object.entries(sourceCharacterRefByKey).reduce<CharacterRefByKey>(
                    (acc, [key, id]) => {
                        if (id === sourceCharacterId) {
                            acc[key] = targetCharacterId;
                            changedCharacterRef = true;

                            return acc;
                        }

                        acc[key] = id;

                        return acc;
                    },
                    {},
                );

                if (!changedCharacterRef) {
                    return node;
                }

                didChange = true;

                return withCharacterRefByKey(node, nextCharacterRefByKey);
            }

            const {
                nodes: nextContent,
                changed: didChangeChildren,
            } = replaceNodes(node.content);

            if (!didChangeChildren) {
                return node;
            }

            didChange = true;

            return {
                ...node,
                content: nextContent,
            };
        });

        return {
            nodes: didChange ? nextNodes : nodes,
            changed: didChange,
        };
    };

    const {
        nodes: nextContent,
        changed,
    } = replaceNodes(value.content);

    if (!changed || !nextContent) {
        return {
            value,
            changed: false,
        };
    }

    return {
        value: {
            ...value,
            content: nextContent,
        },
        changed: true,
    };
};

const collectScriptCharacterStats = (
    documentValue: ScriptDocument | null | undefined,
    confirmedCharacterIdSet: ReadonlySet<string>,
): ScriptCharacterStats => {
    const countsByKey = new Map<string, number>();
    const confirmedCountsById = new Map<string, number>();
    const unconfirmedCountsByKey = new Map<string, number>();
    const walkNodes = (nodes?: FountainJSONContent[]) => {
        if (!Array.isArray(nodes)) {
            return;
        }

        nodes.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (node.type === FOUNTAIN_BLOCK_NODE_NAME) {
                const blockType = node.attrs?.blockType;

                if (isCharacterBlockType(blockType)) {
                    const text = getNodeTextContent(node);
                    const characterRefByKey = getCharacterRefByKey(node.attrs);

                    extractCharacterKeys(text).forEach(key => {
                        countsByKey.set(key, (countsByKey.get(key) ?? 0) + 1);

                        const characterId = characterRefByKey[key];

                        if (characterId && confirmedCharacterIdSet.has(characterId)) {
                            confirmedCountsById.set(characterId, (confirmedCountsById.get(characterId) ?? 0) + 1);

                            return;
                        }

                        unconfirmedCountsByKey.set(key, (unconfirmedCountsByKey.get(key) ?? 0) + 1);
                    });
                }
            }

            walkNodes(node.content);
        });
    };

    walkNodes(documentValue?.content);

    return {
        countsByKey,
        confirmedCountsById,
        unconfirmedCountsByKey,
    };
};

const normalizeSettingsOverride = (settings: EditorSettingsOverride): EditorSettingsOverride => {
    if (!settings.blocks) {
        return settings;
    }

    const nextBlocks = Object.entries(settings.blocks).reduce<NonNullable<EditorSettingsOverride['blocks']>>(
        (acc, [blockType, blockSettings]) => {
            const normalizedBlockType = normalizeSettingsBlockType(blockType);

            if (!normalizedBlockType) {
                return acc;
            }

            if (!blockSettings) {
                acc[normalizedBlockType] = blockSettings;

                return acc;
            }

            const normalizedBlockSettings = {
                ...blockSettings,
            };

            if (blockSettings.nextElement !== undefined) {
                normalizedBlockSettings.nextElement = normalizeSettingsBlockType(blockSettings.nextElement) ?? undefined;
            }

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

            const compactedBlockSettings = Object.fromEntries(
                Object.entries(normalizedBlockSettings).filter(([, value]) => value !== undefined),
            ) as NonNullable<EditorSettingsOverride['blocks']>[FountainElementType];

            if (Object.keys(compactedBlockSettings).length === 0) {
                return acc;
            }

            acc[normalizedBlockType] = {
                ...acc[normalizedBlockType],
                ...compactedBlockSettings,
            };

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
    const scriptRepository = useScriptRepository();
    const [searchParams, setSearchParams] = useSearchParams();
    const {openNewScript} = useGlobalModals();
    const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(false);
    const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
    const [scriptSettingsDraft, setScriptSettingsDraft] = useState<EditorSettingsOverride>({});
    const [editorValue, setEditorValue] = useState<ScriptDocument | null>(null);
    const [editorOverrideValue, setEditorOverrideValue] = useState<ScriptDocument | null>(null);
    const [confirmedCharacterRecords, setConfirmedCharacterRecords] = useState<ScriptCharacterRecord[]>([]);
    const [confirmingCharacterKeys, setConfirmingCharacterKeys] = useState<string[]>([]);
    const [deletingCharacterIds, setDeletingCharacterIds] = useState<string[]>([]);
    const [renamingCharacterIds, setRenamingCharacterIds] = useState<string[]>([]);
    const [renamingCharacterKeys, setRenamingCharacterKeys] = useState<string[]>([]);
    const [isCharactersLoading, setIsCharactersLoading] = useState(false);
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
    const confirmingCharacterSet = useMemo(
        () => new Set(confirmingCharacterKeys),
        [confirmingCharacterKeys],
    );
    const deletingCharacterIdSet = useMemo(
        () => new Set(deletingCharacterIds),
        [deletingCharacterIds],
    );
    const renamingCharacterIdSet = useMemo(
        () => new Set(renamingCharacterIds),
        [renamingCharacterIds],
    );
    const renamingCharacterKeySet = useMemo(
        () => new Set(renamingCharacterKeys),
        [renamingCharacterKeys],
    );
    const confirmedCharactersById = useMemo(() => {
        const result = new Map<string, ScriptCharacterRecord>();

        confirmedCharacterRecords.forEach(character => {
            if (!character.id) {
                return;
            }

            result.set(character.id, character);
        });

        return result;
    }, [confirmedCharacterRecords]);
    const normalizedConfirmedCharacterRecords = useMemo(() => {
        const seen = new Set<string>();
        const normalized: ScriptCharacterRecord[] = [];

        confirmedCharacterRecords.forEach(character => {
            const key = normalizeCharacterKey(character.key);

            if (!key || seen.has(key)) {
                return;
            }

            seen.add(key);
            normalized.push({
                id: character.id,
                key,
            });
        });

        normalized.sort((a, b) => a.key.localeCompare(b.key));

        return normalized;
    }, [confirmedCharacterRecords]);
    const normalizedConfirmedCharacterKeys = useMemo(
        () => normalizedConfirmedCharacterRecords.map(character => character.key),
        [normalizedConfirmedCharacterRecords],
    );
    const confirmedCharacterIdSet = useMemo(
        () => new Set(normalizedConfirmedCharacterRecords.map(character => character.id)),
        [normalizedConfirmedCharacterRecords],
    );
    const scriptCharacterStats = useMemo(
        () => collectScriptCharacterStats(editorValue ?? initialValue, confirmedCharacterIdSet),
        [
            confirmedCharacterIdSet,
            editorValue,
            initialValue,
        ],
    );
    const confirmedCharacterSet = useMemo(
        () => new Set(normalizedConfirmedCharacterKeys),
        [normalizedConfirmedCharacterKeys],
    );
    const confirmedCharacters = useMemo<CharacterCountItem[]>(
        () => normalizedConfirmedCharacterRecords.map(character => ({
            id: character.id,
            key: character.key,
            count: scriptCharacterStats.confirmedCountsById.get(character.id)
                ?? scriptCharacterStats.countsByKey.get(character.key)
                ?? 0,
            color: getCharacterColor(character.key),
            isConfirmed: true,
            isDeletePending: deletingCharacterIdSet.has(character.id),
            isRenamePending: renamingCharacterIdSet.has(character.id),
            isPending: deletingCharacterIdSet.has(character.id) || renamingCharacterIdSet.has(character.id),
        })),
        [
            deletingCharacterIdSet,
            normalizedConfirmedCharacterRecords,
            renamingCharacterIdSet,
            scriptCharacterStats.confirmedCountsById,
            scriptCharacterStats.countsByKey,
        ],
    );
    const unconfirmedCharacters = useMemo<CharacterCountItem[]>(
        () => Array.from(scriptCharacterStats.unconfirmedCountsByKey.entries())
            .filter(([key]) => !confirmedCharacterSet.has(key))
            .filter(([key]) => !renamingCharacterKeySet.has(key))
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, count]) => ({
                key,
                count,
                color: getCharacterColor(key),
                isConfirmed: false,
                isConfirmPending: confirmingCharacterSet.has(key),
                isPending: confirmingCharacterSet.has(key),
            })),
        [
            confirmedCharacterSet,
            confirmingCharacterSet,
            renamingCharacterKeySet,
            scriptCharacterStats.unconfirmedCountsByKey,
        ],
    );

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
        setEditorValue(initialValue ?? null);
        setEditorOverrideValue(null);
    }, [currentScriptId, initialValue]);

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

    useEffect(() => {
        if (!currentScriptId) {
            setConfirmedCharacterRecords([]);
            setConfirmingCharacterKeys([]);
            setDeletingCharacterIds([]);
            setRenamingCharacterIds([]);
            setRenamingCharacterKeys([]);
            setIsCharactersLoading(false);

            return;
        }

        let isActive = true;

        setIsCharactersLoading(true);
        setConfirmingCharacterKeys([]);
        setDeletingCharacterIds([]);
        setRenamingCharacterIds([]);
        setRenamingCharacterKeys([]);

        const loadCharacters = async () => {
            try {
                const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                if (!isActive) {
                    return;
                }

                setConfirmedCharacterRecords(storedCharacters);
            } catch (error) {
                if (!isActive) {
                    return;
                }

                console.error('Failed to load script characters', error);
                setConfirmedCharacterRecords([]);
            } finally {
                if (isActive) {
                    setIsCharactersLoading(false);
                }
            }
        };

        void loadCharacters();

        return () => {
            isActive = false;
        };
    }, [currentScriptId, scriptRepository]);

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
    const handleEditorValueChange = useCallback((value: ScriptDocument) => {
        setEditorValue(value);
    }, []);
    const handleConfirmCharacter = useCallback((characterKey: string) => {
        if (!currentScriptId) {
            return;
        }

        const normalizedKey = normalizeCharacterKey(characterKey);

        if (!normalizedKey || confirmedCharacterSet.has(normalizedKey)) {
            return;
        }

        setConfirmingCharacterKeys(previous => {
            if (previous.includes(normalizedKey)) {
                return previous;
            }

            return [...previous, normalizedKey];
        });

        const run = async () => {
            try {
                const confirmedCharacter = await scriptRepository.confirmScriptCharacter(currentScriptId, normalizedKey);

                if (!confirmedCharacter) {
                    return;
                }

                setConfirmedCharacterRecords(previous => {
                    const next = previous
                        .filter(character => character.id !== confirmedCharacter.id && character.key !== confirmedCharacter.key);

                    next.push(confirmedCharacter);

                    return next;
                });

                const sourceDocument = editorValue ?? initialValue;

                if (sourceDocument) {
                    const {
                        value: linkedDocument,
                        changed: didLinkCharacterRef,
                    } = linkCharacterRefInScriptDocument(
                        sourceDocument,
                        normalizedKey,
                        confirmedCharacter.id,
                    );

                    if (didLinkCharacterRef) {
                        setEditorOverrideValue(linkedDocument);
                        setEditorValue(linkedDocument);
                        await handleAutoSave(linkedDocument);
                    }
                }
            } catch (error) {
                console.error('Failed to confirm script character', error);
            } finally {
                setConfirmingCharacterKeys(previous => previous.filter(value => value !== normalizedKey));
            }
        };

        void run();
    }, [
        confirmedCharacterSet,
        currentScriptId,
        editorValue,
        handleAutoSave,
        initialValue,
        scriptRepository,
    ]);
    const getCharacterNameForBlockType = useCallback((name: string, blockType: unknown) => {
        const normalizedName = normalizeCharacterDisplayName(name);
        const shouldUppercase = (blockType === ELEMENT_CHARACTER || blockType === ELEMENT_DUAL_DIALOGUE_CHARACTER)
            && (
                resolvedScriptSettings.blocks[blockType].casing
                ?? DEFAULT_EDITOR_SETTINGS.blocks[blockType].casing
                ?? 'normal'
            ) === 'uppercase';

        return shouldUppercase
            ? normalizedName.toUpperCase()
            : normalizedName;
    }, [resolvedScriptSettings.blocks]);
    const normalizeCharacterNameForInlineInput = useCallback((name: string) => {
        return getCharacterNameForBlockType(name, ELEMENT_CHARACTER);
    }, [getCharacterNameForBlockType]);
    const handleRenameCharacterPreview = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
    ) => {
        if (!currentScriptId) {
            return;
        }

        if (!characterId) {
            return;
        }

        const characterRecord = confirmedCharactersById.get(characterId);

        if (!characterRecord) {
            return;
        }

        const previousKey = normalizeCharacterKey(characterRecord.key);
        const normalizedNextName = normalizeCharacterDisplayName(nextCharacterName);

        if (!previousKey || normalizedNextName.length === 0) {
            return;
        }

        const sourceDocument = editorValue ?? initialValue;

        if (!sourceDocument) {
            return;
        }

        const {
            value: nextDocument,
            changed: didChangeDocument,
        } = renameCharacterInScriptDocument(
            sourceDocument,
            previousKey,
            normalizedNextName,
            getCharacterNameForBlockType,
            {characterId},
        );

        if (!didChangeDocument) {
            return;
        }

        setEditorOverrideValue(nextDocument);
    }, [
        confirmedCharactersById,
        currentScriptId,
        editorValue,
        getCharacterNameForBlockType,
        initialValue,
    ]);
    const handleDeleteCharacter = useCallback((characterId: string) => {
        if (!currentScriptId) {
            return;
        }

        if (!characterId) {
            return;
        }

        if (!confirmedCharactersById.has(characterId)) {
            return;
        }

        setDeletingCharacterIds(previous => {
            if (previous.includes(characterId)) {
                return previous;
            }

            return [...previous, characterId];
        });

        const run = async () => {
            try {
                await scriptRepository.deleteScriptCharacter(currentScriptId, characterId);
                setConfirmedCharacterRecords(previous => {
                    return previous.filter(character => character.id !== characterId);
                });

                const sourceDocument = editorValue ?? initialValue;

                if (sourceDocument) {
                    const {
                        value: unlinkedDocument,
                        changed: didUnlinkCharacterRef,
                    } = unlinkCharacterRefInScriptDocument(sourceDocument, characterId);

                    if (didUnlinkCharacterRef) {
                        setEditorOverrideValue(unlinkedDocument);
                        setEditorValue(unlinkedDocument);
                        await handleAutoSave(unlinkedDocument);
                    }
                }
            } catch (error) {
                console.error('Failed to delete script character', error);
            } finally {
                setDeletingCharacterIds(previous => previous.filter(value => value !== characterId));
            }
        };

        void run();
    }, [
        confirmedCharactersById,
        currentScriptId,
        editorValue,
        handleAutoSave,
        initialValue,
        scriptRepository,
    ]);
    const handleRenameCharacter = useCallback((
        characterId: string,
        _previousCharacterName: string,
        nextCharacterName: string,
    ) => {
        if (!currentScriptId) {
            return;
        }

        const characterRecord = confirmedCharactersById.get(characterId);

        if (!characterRecord) {
            return;
        }

        const previousKey = normalizeCharacterKey(characterRecord.key);
        const normalizedNextName = normalizeCharacterDisplayName(nextCharacterName);
        const nextKey = normalizeCharacterKey(normalizedNextName);

        if (!previousKey || !nextKey) {
            return;
        }

        const sourceDocument = editorValue ?? initialValue;

        if (!sourceDocument) {
            return;
        }

        setRenamingCharacterIds(previous => {
            if (previous.includes(characterId)) {
                return previous;
            }

            return [...previous, characterId];
        });
        setRenamingCharacterKeys(previous => {
            const next = new Set(previous);

            next.add(previousKey);
            next.add(nextKey);

            return Array.from(next);
        });

        const run = async () => {
            try {
                const {
                    value: renamedDocument,
                    changed: didChangeDocument,
                } = renameCharacterInScriptDocument(
                    sourceDocument,
                    previousKey,
                    normalizedNextName,
                    getCharacterNameForBlockType,
                    {characterId},
                );
                let documentToPersist = didChangeDocument
                    ? renamedDocument
                    : sourceDocument;

                if (didChangeDocument) {
                    const didSave = await handleAutoSave(renamedDocument);

                    if (!didSave) {
                        const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                        setConfirmedCharacterRecords(storedCharacters);

                        return;
                    }

                    setEditorOverrideValue(renamedDocument);
                    setEditorValue(renamedDocument);
                }

                const renamedCharacter = await scriptRepository.renameScriptCharacter(
                    currentScriptId,
                    characterId,
                    nextKey,
                );

                if (renamedCharacter) {
                    setConfirmedCharacterRecords(previous => {
                        const next = previous
                            .filter(character => character.id !== characterId && character.id !== renamedCharacter.id);

                        next.push(renamedCharacter);

                        return next;
                    });

                    if (renamedCharacter.id !== characterId) {
                        const {
                            value: relinkedDocument,
                            changed: didRelinkCharacterRef,
                        } = replaceCharacterRefIdInScriptDocument(
                            documentToPersist,
                            characterId,
                            renamedCharacter.id,
                        );

                        if (didRelinkCharacterRef) {
                            documentToPersist = relinkedDocument;
                            setEditorOverrideValue(relinkedDocument);
                            setEditorValue(relinkedDocument);
                            await handleAutoSave(relinkedDocument);
                        }
                    }
                } else {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
                }
            } catch (error) {
                console.error('Failed to rename script character', error);

                try {
                    const storedCharacters = await scriptRepository.listScriptCharacters(currentScriptId);

                    setConfirmedCharacterRecords(storedCharacters);
                } catch (refreshError) {
                    console.error('Failed to refresh script characters after rename failure', refreshError);
                }
            } finally {
                setRenamingCharacterIds(previous => previous.filter(value => value !== characterId));
                setRenamingCharacterKeys(previous => previous
                    .filter(value => value !== previousKey && value !== nextKey));
            }
        };

        void run();
    }, [
        confirmedCharactersById,
        currentScriptId,
        editorValue,
        getCharacterNameForBlockType,
        handleAutoSave,
        initialValue,
        scriptRepository,
    ]);
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
                '--preview-text-color': BLOCK_PREVIEW_TEXT_COLOR[blockType],
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
                initialValue={editorOverrideValue ?? initialValue}
                scriptSettings={scriptSettingsDraft}
                onValueChange={handleEditorValueChange}
                onAutoSave={handleAutoSave}
                onManualSave={handleManualSave}
                autoSaveDelayMs={AUTOSAVE_DELAY_MS}
                autoFocus={shouldAutoFocus}
                persistentCharacters={normalizedConfirmedCharacterRecords}
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
                        confirmedCharacters={confirmedCharacters}
                        unconfirmedCharacters={unconfirmedCharacters}
                        onConfirmCharacter={handleConfirmCharacter}
                        onDeleteCharacter={handleDeleteCharacter}
                        normalizeRenameInput={normalizeCharacterNameForInlineInput}
                        onRenameCharacterPreview={handleRenameCharacterPreview}
                        onRenameCharacter={handleRenameCharacter}
                        isLoading={isCharactersLoading}
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
