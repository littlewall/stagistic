import {FOUNTAIN_BLOCK_ITEMS, type FountainElementType} from '@stagistic/script-core';
import {clsx} from '@stagistic/ui';
import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react';

import styles from '../../ScriptEditorRoute.module.css';
import type {
    ProductionSettingsPanelProps,
} from './productionTypes';

const LAYER_TYPE_OPTIONS = [
    'notes',
    'lighting',
    'sound',
    'choreography',
    'direction',
    'acting',
    'stage_management',
] as const;

const DEPARTMENT_OPTIONS = [
    'direction',
    'lighting',
    'sound',
    'acting',
    'choreography',
    'stage_management',
] as const;

const ANNOTATION_TYPE_OPTIONS = [
    'note',
    'cue',
    'comment',
] as const;

const toNumberOrNull = (value: string): number | null => {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
        return null;
    }

    const parsed = Number.parseInt(trimmed, 10);

    if (!Number.isFinite(parsed)) {
        return null;
    }

    return parsed;
};

export const ProductionSettingsPanel = ({
    data,
    actions,
}: ProductionSettingsPanelProps) => {
    const [layerName, setLayerName] = useState('');
    const [layerType, setLayerType] = useState<string>(LAYER_TYPE_OPTIONS[0]);
    const [layerDepartment, setLayerDepartment] = useState<string>(DEPARTMENT_OPTIONS[0]);
    const [layerColor, setLayerColor] = useState('');

    const [viewName, setViewName] = useState('');
    const [viewRoleTemplate, setViewRoleTemplate] = useState('');
    const [viewLayerIds, setViewLayerIds] = useState<Set<string>>(new Set());
    const [viewBlockTypes, setViewBlockTypes] = useState<Set<FountainElementType>>(new Set());

    const [annotationLayerId, setAnnotationLayerId] = useState('');
    const [annotationType, setAnnotationType] = useState<string>(ANNOTATION_TYPE_OPTIONS[0]);
    const [annotationAnchorText, setAnnotationAnchorText] = useState('');
    const [annotationPayloadText, setAnnotationPayloadText] = useState('');
    const [annotationStartOffset, setAnnotationStartOffset] = useState('');
    const [annotationEndOffset, setAnnotationEndOffset] = useState('');

    const [sceneVersionMessage, setSceneVersionMessage] = useState('');

    const [propName, setPropName] = useState('');
    const [propCategory, setPropCategory] = useState('');

    const [costumeName, setCostumeName] = useState('');
    const [costumeCharacterId, setCostumeCharacterId] = useState('');

    const [cueSheetName, setCueSheetName] = useState('');
    const [cueSheetLayerId, setCueSheetLayerId] = useState('');

    const layerNameById = useMemo(() => {
        return new Map(data.layers.map(layer => [layer.id, layer.name] as const));
    }, [data.layers]);

    const characterNameById = useMemo(() => {
        return new Map(data.characterOptions.map(row => [row.id, row.key] as const));
    }, [data.characterOptions]);

    const dateFormatter = useMemo(() => {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    }, []);

    useEffect(() => {
        if (annotationLayerId) {
            return;
        }

        if (data.layers.length === 0) {
            return;
        }

        setAnnotationLayerId(data.layers[0].id);
    }, [annotationLayerId, data.layers]);

    useEffect(() => {
        if (cueSheetLayerId) {
            return;
        }

        if (data.layers.length === 0) {
            return;
        }

        setCueSheetLayerId(data.layers[0].id);
    }, [cueSheetLayerId, data.layers]);

    useEffect(() => {
        if (costumeCharacterId) {
            return;
        }

        if (data.characterOptions.length === 0) {
            return;
        }

        setCostumeCharacterId(data.characterOptions[0].id);
    }, [costumeCharacterId, data.characterOptions]);

    const toggleViewLayer = useCallback((layerId: string) => {
        setViewLayerIds(previous => {
            const next = new Set(previous);

            if (next.has(layerId)) {
                next.delete(layerId);

                return next;
            }

            next.add(layerId);

            return next;
        });
    }, []);

    const toggleViewBlockType = useCallback((blockType: FountainElementType) => {
        setViewBlockTypes(previous => {
            const next = new Set(previous);

            if (next.has(blockType)) {
                next.delete(blockType);

                return next;
            }

            next.add(blockType);

            return next;
        });
    }, []);

    const handleCreateLayer = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const didCreate = await actions.onCreateLayer({
            name: layerName,
            layerType,
            department: layerDepartment,
            colorHex: layerColor.trim() || null,
        });

        if (!didCreate) {
            return;
        }

        setLayerName('');
        setLayerColor('');
    }, [
        actions,
        layerColor,
        layerDepartment,
        layerName,
        layerType,
    ]);

    const handleCreateView = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const selectedLayerIds = viewLayerIds.size > 0
            ? [...viewLayerIds]
            : data.layers.filter(layer => layer.isVisible).map(layer => layer.id);
        const selectedBlockTypes = viewBlockTypes.size > 0
            ? [...viewBlockTypes]
            : [];
        const didCreate = await actions.onCreateView({
            name: viewName,
            roleTemplate: viewRoleTemplate.trim() || null,
            visibleLayerIds: selectedLayerIds,
            visibleBlockTypes: selectedBlockTypes,
        });

        if (!didCreate) {
            return;
        }

        setViewName('');
        setViewRoleTemplate('');
        setViewLayerIds(new Set());
        setViewBlockTypes(new Set());
    }, [
        actions,
        data.layers,
        viewBlockTypes,
        viewLayerIds,
        viewName,
        viewRoleTemplate,
    ]);

    const handleCreateAnnotation = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const didCreate = await actions.onCreateAnnotation({
            layerId: annotationLayerId,
            annotationType,
            anchorText: annotationAnchorText,
            payloadText: annotationPayloadText,
            startOffset: toNumberOrNull(annotationStartOffset),
            endOffset: toNumberOrNull(annotationEndOffset),
        });

        if (!didCreate) {
            return;
        }

        setAnnotationAnchorText('');
        setAnnotationPayloadText('');
        setAnnotationStartOffset('');
        setAnnotationEndOffset('');
    }, [
        actions,
        annotationAnchorText,
        annotationEndOffset,
        annotationLayerId,
        annotationPayloadText,
        annotationStartOffset,
        annotationType,
    ]);

    const handleCreateSceneVersion = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!data.selectedSceneId) {
            return;
        }

        const didCreate = await actions.onCreateSceneVersion({
            sceneId: data.selectedSceneId,
            message: sceneVersionMessage,
        });

        if (!didCreate) {
            return;
        }

        setSceneVersionMessage('');
    }, [
        actions,
        data.selectedSceneId,
        sceneVersionMessage,
    ]);

    const handleCreateProp = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const didCreate = await actions.onCreateProp({
            name: propName,
            category: propCategory,
        });

        if (!didCreate) {
            return;
        }

        setPropName('');
        setPropCategory('');
    }, [
        actions,
        propCategory,
        propName,
    ]);

    const handleCreateCostume = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const didCreate = await actions.onCreateCostume({
            name: costumeName,
            characterId: costumeCharacterId,
        });

        if (!didCreate) {
            return;
        }

        setCostumeName('');
    }, [
        actions,
        costumeCharacterId,
        costumeName,
    ]);

    const handleCreateCueSheet = useCallback(async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const didCreate = await actions.onCreateCueSheet({
            name: cueSheetName,
            layerId: cueSheetLayerId,
        });

        if (!didCreate) {
            return;
        }

        setCueSheetName('');
    }, [
        actions,
        cueSheetLayerId,
        cueSheetName,
    ]);

    if (!data.isEnabled) {
        return (
            <div className={styles.panelStack}>
                <h3 className={styles.panelTitle}>Production</h3>
                <p className={styles.panelDescription}>
                    Production features require an active script repository.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.panelStack}>
            <div className={styles.productionSectionHeader}>
                <h3 className={styles.panelTitle}>Production</h3>
                <button
                    type="button"
                    className={styles.productionButtonSecondary}
                    onClick={() => {
                        void actions.onReload();
                    }}
                >
                    Refresh
                </button>
            </div>
            {data.error ? (
                <p className={styles.panelDescription}>{data.error}</p>
            ) : null}
            <section className={styles.productionSection}>
                <div className={styles.productionSectionHeader}>
                    <h4 className={styles.productionSectionTitle}>Layers</h4>
                    <span className={styles.productionMeta}>{data.layers.length}</span>
                </div>
                <form
                    className={styles.productionGrid}
                    onSubmit={event => {
                        void handleCreateLayer(event);
                    }}
                >
                    <label className={styles.productionField}>
                        Name
                        <input
                            value={layerName}
                            onChange={event => {
                                setLayerName(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="Lighting cues"
                            required
                        />
                    </label>
                    <label className={styles.productionField}>
                        Layer type
                        <select
                            value={layerType}
                            onChange={event => {
                                setLayerType(event.target.value);
                            }}
                            className={styles.productionSelect}
                        >
                            {LAYER_TYPE_OPTIONS.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.productionField}>
                        Department
                        <select
                            value={layerDepartment}
                            onChange={event => {
                                setLayerDepartment(event.target.value);
                            }}
                            className={styles.productionSelect}
                        >
                            {DEPARTMENT_OPTIONS.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.productionField}>
                        Color (hex)
                        <input
                            value={layerColor}
                            onChange={event => {
                                setLayerColor(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="#22A06B"
                        />
                    </label>
                    <div className={styles.productionButtonRow}>
                        <button type="submit" className={styles.productionButton}>Create layer</button>
                    </div>
                </form>
                <ul className={styles.productionList}>
                    {data.layers.map(layer => (
                        <li key={layer.id} className={styles.productionListItem}>
                            <div className={styles.productionItemMain}>
                                <label className={styles.productionCheckboxRow}>
                                    <input
                                        type="checkbox"
                                        checked={layer.isVisible}
                                        onChange={event => {
                                            void actions.onSetLayerVisibility(layer.id, event.target.checked);
                                        }}
                                    />
                                    <span
                                        className={styles.productionColorDot}
                                        style={{backgroundColor: layer.colorHex ?? 'var(--color-accent)'}}
                                        aria-hidden="true"
                                    />
                                    <span>{layer.name}</span>
                                </label>
                                <span className={styles.productionMuted}>{layer.department}/{layer.layerType}</span>
                            </div>
                            <button
                                type="button"
                                className={styles.productionDangerButton}
                                onClick={() => {
                                    void actions.onDeleteLayer(layer.id);
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
            <section className={styles.productionSection}>
                <div className={styles.productionSectionHeader}>
                    <h4 className={styles.productionSectionTitle}>Views</h4>
                    <span className={styles.productionMeta}>{data.views.length}</span>
                </div>
                <form
                    className={styles.productionGrid}
                    onSubmit={event => {
                        void handleCreateView(event);
                    }}
                >
                    <label className={styles.productionField}>
                        Name
                        <input
                            value={viewName}
                            onChange={event => {
                                setViewName(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="Director view"
                            required
                        />
                    </label>
                    <label className={styles.productionField}>
                        Role template
                        <input
                            value={viewRoleTemplate}
                            onChange={event => {
                                setViewRoleTemplate(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="director"
                        />
                    </label>
                    <div className={styles.productionSelectionGroup}>
                        <span className={styles.productionFieldLabel}>Visible layers</span>
                        <div className={styles.productionChipWrap}>
                            {data.layers.map(layer => {
                                const isSelected = viewLayerIds.has(layer.id);

                                return (
                                    <button
                                        key={layer.id}
                                        type="button"
                                        className={clsx(
                                            styles.productionChip,
                                            isSelected && styles.productionChipActive,
                                        )}
                                        onClick={() => {
                                            toggleViewLayer(layer.id);
                                        }}
                                    >
                                        {layer.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className={styles.productionSelectionGroup}>
                        <span className={styles.productionFieldLabel}>Visible block types</span>
                        <div className={styles.productionChipWrap}>
                            {FOUNTAIN_BLOCK_ITEMS.map(item => {
                                const isSelected = viewBlockTypes.has(item.type);

                                return (
                                    <button
                                        key={item.type}
                                        type="button"
                                        className={clsx(
                                            styles.productionChip,
                                            isSelected && styles.productionChipActive,
                                        )}
                                        onClick={() => {
                                            toggleViewBlockType(item.type);
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className={styles.productionButtonRow}>
                        <button type="submit" className={styles.productionButton}>Create view</button>
                    </div>
                </form>
                <ul className={styles.productionList}>
                    {data.views.map(view => (
                        <li key={view.id} className={styles.productionListItem}>
                            <label className={styles.productionCheckboxRow}>
                                <input
                                    type="radio"
                                    name="active-view"
                                    checked={data.activeViewId === view.id}
                                    onChange={() => {
                                        actions.onSetActiveView(view.id);
                                    }}
                                />
                                <span>{view.name}</span>
                            </label>
                            <button
                                type="button"
                                className={styles.productionDangerButton}
                                onClick={() => {
                                    void actions.onDeleteView(view.id);
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
            <section className={styles.productionSection}>
                <div className={styles.productionSectionHeader}>
                    <h4 className={styles.productionSectionTitle}>Annotations</h4>
                    <span className={styles.productionMeta}>Active block: {data.activeBlockId ?? 'none'}</span>
                </div>
                <form
                    className={styles.productionGrid}
                    onSubmit={event => {
                        void handleCreateAnnotation(event);
                    }}
                >
                    <label className={styles.productionField}>
                        Layer
                        <select
                            value={annotationLayerId}
                            onChange={event => {
                                setAnnotationLayerId(event.target.value);
                            }}
                            className={styles.productionSelect}
                        >
                            {data.layers.map(layer => (
                                <option key={layer.id} value={layer.id}>{layer.name}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.productionField}>
                        Type
                        <select
                            value={annotationType}
                            onChange={event => {
                                setAnnotationType(event.target.value);
                            }}
                            className={styles.productionSelect}
                        >
                            {ANNOTATION_TYPE_OPTIONS.map(option => (
                                <option key={option} value={option}>{option}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.productionField}>
                        Anchor text
                        <input
                            value={annotationAnchorText}
                            onChange={event => {
                                setAnnotationAnchorText(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="Find me in block"
                        />
                    </label>
                    <label className={styles.productionField}>
                        Payload text
                        <input
                            value={annotationPayloadText}
                            onChange={event => {
                                setAnnotationPayloadText(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="Cue note"
                            required
                        />
                    </label>
                    <label className={styles.productionField}>
                        Start offset
                        <input
                            value={annotationStartOffset}
                            onChange={event => {
                                setAnnotationStartOffset(event.target.value);
                            }}
                            className={styles.productionInput}
                            inputMode="numeric"
                            placeholder="auto"
                        />
                    </label>
                    <label className={styles.productionField}>
                        End offset
                        <input
                            value={annotationEndOffset}
                            onChange={event => {
                                setAnnotationEndOffset(event.target.value);
                            }}
                            className={styles.productionInput}
                            inputMode="numeric"
                            placeholder="auto"
                        />
                    </label>
                    <div className={styles.productionButtonRow}>
                        <button
                            type="submit"
                            className={styles.productionButton}
                            disabled={!data.activeBlockId}
                        >
                            Add annotation
                        </button>
                    </div>
                </form>
                <ul className={styles.productionList}>
                    {data.activeBlockAnnotations.map(annotation => (
                        <li key={annotation.id} className={styles.productionListItem}>
                            <div className={styles.productionItemMain}>
                                <span>
                                    {layerNameById.get(annotation.layerId) ?? annotation.layerId} • {annotation.annotationType}
                                </span>
                                <span className={styles.productionMuted}>
                                    {annotation.status}
                                    {' '}
                                    ({annotation.startOffset ?? '-'}:{annotation.endOffset ?? '-'})
                                </span>
                            </div>
                            <div className={styles.productionInlineActions}>
                                {annotation.status === 'resolved' ? (
                                    <button
                                        type="button"
                                        className={styles.productionButtonSecondary}
                                        onClick={() => {
                                            void actions.onSetAnnotationStatus(annotation.id, 'active');
                                        }}
                                    >
                                        Reopen
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className={styles.productionButtonSecondary}
                                        onClick={() => {
                                            void actions.onSetAnnotationStatus(annotation.id, 'resolved');
                                        }}
                                    >
                                        Resolve
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className={styles.productionDangerButton}
                                    onClick={() => {
                                        void actions.onDeleteAnnotation(annotation.id);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
            <section className={styles.productionSection}>
                <div className={styles.productionSectionHeader}>
                    <h4 className={styles.productionSectionTitle}>Scene snapshots</h4>
                    <span className={styles.productionMeta}>{data.sceneVersions.length}</span>
                </div>
                <form
                    className={styles.productionGrid}
                    onSubmit={event => {
                        void handleCreateSceneVersion(event);
                    }}
                >
                    <label className={styles.productionField}>
                        Scene
                        <select
                            value={data.selectedSceneId ?? ''}
                            onChange={event => {
                                actions.onSelectScene(event.target.value);
                            }}
                            className={styles.productionSelect}
                        >
                            {data.sceneOptions.map(scene => (
                                <option key={scene.id} value={scene.id}>{scene.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className={styles.productionField}>
                        Message
                        <input
                            value={sceneVersionMessage}
                            onChange={event => {
                                setSceneVersionMessage(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="Before scene rewrite"
                        />
                    </label>
                    <div className={styles.productionButtonRow}>
                        <button type="submit" className={styles.productionButton}>
                            Create snapshot
                        </button>
                    </div>
                </form>
                <ul className={styles.productionList}>
                    {data.sceneVersions.map(version => (
                        <li key={version.id} className={styles.productionListItem}>
                            <div className={styles.productionItemMain}>
                                <span>{version.message ?? 'Scene snapshot'}</span>
                                <span className={styles.productionMuted}>{dateFormatter.format(version.createdAt)}</span>
                            </div>
                            <button
                                type="button"
                                className={styles.productionButtonSecondary}
                                onClick={() => {
                                    void actions.onRestoreSceneVersion(version.id);
                                }}
                            >
                                Restore
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
            <section className={styles.productionSection}>
                <h4 className={styles.productionSectionTitle}>Props / Costumes / Cue sheets</h4>
                <form
                    className={styles.productionGrid}
                    onSubmit={event => {
                        void handleCreateProp(event);
                    }}
                >
                    <label className={styles.productionField}>
                        Prop name
                        <input
                            value={propName}
                            onChange={event => {
                                setPropName(event.target.value);
                            }}
                            className={styles.productionInput}
                            required
                        />
                    </label>
                    <label className={styles.productionField}>
                        Category
                        <input
                            value={propCategory}
                            onChange={event => {
                                setPropCategory(event.target.value);
                            }}
                            className={styles.productionInput}
                            placeholder="set"
                        />
                    </label>
                    <div className={styles.productionButtonRow}>
                        <button type="submit" className={styles.productionButton}>Create prop</button>
                    </div>
                </form>
                <ul className={styles.productionList}>
                    {data.propsItems.map(row => (
                        <li key={row.id} className={styles.productionListItem}>
                            <span>{row.name}{row.category ? ` (${row.category})` : ''}</span>
                            <button
                                type="button"
                                className={styles.productionDangerButton}
                                onClick={() => {
                                    void actions.onDeleteProp(row.id);
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
                <form
                    className={styles.productionGrid}
                    onSubmit={event => {
                        void handleCreateCostume(event);
                    }}
                >
                    <label className={styles.productionField}>
                        Costume name
                        <input
                            value={costumeName}
                            onChange={event => {
                                setCostumeName(event.target.value);
                            }}
                            className={styles.productionInput}
                            required
                        />
                    </label>
                    <label className={styles.productionField}>
                        Character
                        <select
                            value={costumeCharacterId}
                            onChange={event => {
                                setCostumeCharacterId(event.target.value);
                            }}
                            className={styles.productionSelect}
                        >
                            {data.characterOptions.map(row => (
                                <option key={row.id} value={row.id}>{row.key}</option>
                            ))}
                        </select>
                    </label>
                    <div className={styles.productionButtonRow}>
                        <button
                            type="submit"
                            className={styles.productionButton}
                            disabled={data.characterOptions.length === 0}
                        >
                            Create costume
                        </button>
                    </div>
                </form>
                <ul className={styles.productionList}>
                    {data.costumeItems.map(row => (
                        <li key={row.id} className={styles.productionListItem}>
                            <span>{row.name} • {characterNameById.get(row.characterId) ?? row.characterId}</span>
                            <button
                                type="button"
                                className={styles.productionDangerButton}
                                onClick={() => {
                                    void actions.onDeleteCostume(row.id);
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
                <form
                    className={styles.productionGrid}
                    onSubmit={event => {
                        void handleCreateCueSheet(event);
                    }}
                >
                    <label className={styles.productionField}>
                        Cue sheet name
                        <input
                            value={cueSheetName}
                            onChange={event => {
                                setCueSheetName(event.target.value);
                            }}
                            className={styles.productionInput}
                            required
                        />
                    </label>
                    <label className={styles.productionField}>
                        Layer
                        <select
                            value={cueSheetLayerId}
                            onChange={event => {
                                setCueSheetLayerId(event.target.value);
                            }}
                            className={styles.productionSelect}
                        >
                            {data.layers.map(row => (
                                <option key={row.id} value={row.id}>{row.name}</option>
                            ))}
                        </select>
                    </label>
                    <div className={styles.productionButtonRow}>
                        <button
                            type="submit"
                            className={styles.productionButton}
                            disabled={data.layers.length === 0}
                        >
                            Create cue sheet
                        </button>
                    </div>
                </form>
                <ul className={styles.productionList}>
                    {data.cueSheetItems.map(row => (
                        <li key={row.id} className={styles.productionListItem}>
                            <span>{row.name} • {layerNameById.get(row.layerId) ?? row.layerId}</span>
                            <button
                                type="button"
                                className={styles.productionDangerButton}
                                onClick={() => {
                                    void actions.onDeleteCueSheet(row.id);
                                }}
                            >
                                Delete
                            </button>
                        </li>
                    ))}
                </ul>
            </section>
            <section className={styles.productionSection}>
                <h4 className={styles.productionSectionTitle}>Members and permissions (schema scaffold)</h4>
                <p className={styles.productionMuted}>
                    Members: {data.members.length} • Permissions: {data.permissions.length}
                </p>
                <ul className={styles.productionList}>
                    {data.members.map(member => (
                        <li key={member.id} className={styles.productionListItem}>
                            <span>{member.userId}</span>
                            <span className={styles.productionMuted}>{member.role}</span>
                        </li>
                    ))}
                </ul>
                <ul className={styles.productionList}>
                    {data.permissions.map(permission => (
                        <li key={permission.id} className={styles.productionListItem}>
                            <span>{permission.role}</span>
                            <span className={styles.productionMuted}>{permission.resourceType}:{permission.action}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
};
