import type {useScriptRepository} from '@stagistic/app-core';
import {
    createNodeId,
    type FountainElementType,
    type FountainJSONContent,
    getScriptBlockId,
    isLegacyFountainBlockType,
    isScriptBlockNode,
    type ScriptBlockIndexSnapshot,
    type ScriptDocument,
} from '@stagistic/script-core';
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import type {
    CreateCostumeInput,
    CreateCueSheetInput,
    CreateProductionAnnotationInput,
    CreateProductionLayerInput,
    CreateProductionViewInput,
    CreatePropInput,
    CreateSceneVersionInput,
    ProductionAnnotationItem,
    ProductionCharacterOption,
    ProductionCostumeItem,
    ProductionCueSheetItem,
    ProductionLayerItem,
    ProductionMemberItem,
    ProductionPermissionItem,
    ProductionPropItem,
    ProductionSceneOption,
    ProductionSceneVersionItem,
    ProductionSettingsPanelActions,
    ProductionSettingsPanelData,
    ProductionViewItem,
} from './productionTypes';

type ScriptRepositoryApi = ReturnType<typeof useScriptRepository>;

type LayerRecord = Awaited<ReturnType<ScriptRepositoryApi['layers']['list']>>[number];
type ViewRecord = Awaited<ReturnType<ScriptRepositoryApi['views']['list']>>[number];
type AnnotationRecord = Awaited<ReturnType<ScriptRepositoryApi['annotations']['listByLayer']>>[number];
type SceneRecord = Awaited<ReturnType<ScriptRepositoryApi['scenes']['list']>>[number];
type SceneVersionRecord = Awaited<ReturnType<ScriptRepositoryApi['sceneVersions']['list']>>[number];
type PropRecord = Awaited<ReturnType<ScriptRepositoryApi['props']['list']>>[number];
type CostumeRecord = Awaited<ReturnType<ScriptRepositoryApi['costumes']['list']>>[number];
type CueSheetRecord = Awaited<ReturnType<ScriptRepositoryApi['cueSheets']['list']>>[number];
type MemberRecord = Awaited<ReturnType<ScriptRepositoryApi['members']['list']>>[number];
type PermissionRecord = Awaited<ReturnType<ScriptRepositoryApi['permissions']['list']>>[number];
type SceneBlockRecord = Awaited<ReturnType<ScriptRepositoryApi['blocks']['listByScene']>>[number];

interface ParsedViewConfig {
    visibleLayerIds: string[],
    visibleBlockTypes: FountainElementType[],
}

interface EditorAnnotationRecord {
    id: string,
    blockId: string,
    layerId: string,
    annotationType: string,
    startOffset: number | null,
    endOffset: number | null,
    status: string,
}

interface EditorViewFilterRecord {
    visibleLayerIds?: readonly string[],
    visibleBlockTypes?: readonly FountainElementType[],
}

interface UseProductionSettingsControllerArgs {
    scriptId: string | null,
    scriptRepository: ScriptRepositoryApi,
    indexSnapshot: ScriptBlockIndexSnapshot | null,
    confirmedCharacters: readonly ProductionCharacterOption[],
    onRestoredDocument: (value: ScriptDocument) => void,
}

interface UseProductionSettingsControllerResult {
    panel: {
        data: ProductionSettingsPanelData,
        actions: ProductionSettingsPanelActions,
    },
    editor: {
        annotations: EditorAnnotationRecord[] | undefined,
        viewFilter: EditorViewFilterRecord | undefined,
    },
    callbacks: {
        onEditorValueChange: (value: ScriptDocument) => void,
        onActiveBlockChange: (blockId: string | null) => void,
    },
}

const LAYER_COLOR_PALETTE = [
    '#E58B3C',
    '#22A06B',
    '#3B82F6',
    '#D946EF',
    '#F97316',
    '#14B8A6',
] as const;

const DEFAULT_LAYER_TYPE = 'notes';
const DEFAULT_LAYER_DEPARTMENT = 'direction';
const DEFAULT_VIEW_BLOCK_TYPES: FountainElementType[] = [];

const readNodeText = (node: FountainJSONContent): string => {
    if (typeof node.text === 'string') {
        return node.text;
    }

    if (!Array.isArray(node.content)) {
        return '';
    }

    return node.content.map(readNodeText).join('');
};

const collectBlockTextById = (value: ScriptDocument): Map<string, string> => {
    const blockTextById = new Map<string, string>();

    const walk = (nodes: FountainJSONContent[] | undefined) => {
        if (!Array.isArray(nodes)) {
            return;
        }

        nodes.forEach(node => {
            if (!node || typeof node !== 'object') {
                return;
            }

            if (isScriptBlockNode(node)) {
                const blockId = getScriptBlockId(node);

                if (!blockId) {
                    return;
                }

                blockTextById.set(blockId, readNodeText(node));

                return;
            }

            walk(node.content);
        });
    };

    walk(value.content);

    return blockTextById;
};

const parseViewConfig = (configJson: string): ParsedViewConfig => {
    let rawConfig: unknown;

    try {
        rawConfig = JSON.parse(configJson);
    } catch {
        return {
            visibleLayerIds: [],
            visibleBlockTypes: [],
        };
    }

    if (!rawConfig || typeof rawConfig !== 'object') {
        return {
            visibleLayerIds: [],
            visibleBlockTypes: [],
        };
    }

    const candidate = rawConfig as {
        visibleLayerIds?: unknown,
        visibleBlockTypes?: unknown,
    };
    const visibleLayerIds = Array.isArray(candidate.visibleLayerIds)
        ? candidate.visibleLayerIds.filter((value): value is string => typeof value === 'string' && value.length > 0)
        : [];
    const visibleBlockTypes = Array.isArray(candidate.visibleBlockTypes)
        ? candidate.visibleBlockTypes.filter((value): value is FountainElementType => isLegacyFountainBlockType(value))
        : [];

    return {
        visibleLayerIds,
        visibleBlockTypes,
    };
};

const resolveSceneIdFromActiveBlock = (
    indexSnapshot: ScriptBlockIndexSnapshot | null,
    scenes: readonly SceneRecord[],
    activeBlockId: string | null,
): string | null => {
    if (!indexSnapshot || !activeBlockId) {
        return null;
    }

    const activeBlockRow = indexSnapshot.blocks.find(block => block.blockId === activeBlockId);

    if (!activeBlockRow?.sceneBlockId) {
        return null;
    }

    const scene = scenes.find(row => row.headingBlockId === activeBlockRow.sceneBlockId);

    return scene?.id ?? null;
};

const findAnchorRange = (
    text: string,
    anchorText: string,
    preferredStartOffset: number | null,
): {
    startOffset: number,
    endOffset: number,
} | null => {
    if (anchorText.length === 0) {
        return null;
    }

    let cursor = text.indexOf(anchorText);

    if (cursor < 0) {
        return null;
    }

    let bestStartOffset = cursor;
    let bestDistance = preferredStartOffset === null
        ? 0
        : Math.abs(cursor - preferredStartOffset);

    while (cursor >= 0) {
        const distance = preferredStartOffset === null
            ? 0
            : Math.abs(cursor - preferredStartOffset);

        if (distance < bestDistance) {
            bestDistance = distance;
            bestStartOffset = cursor;
        }

        cursor = text.indexOf(anchorText, cursor + 1);
    }

    return {
        startOffset: bestStartOffset,
        endOffset: bestStartOffset + anchorText.length,
    };
};

const resolveAnnotationRange = (
    annotation: AnnotationRecord,
    blockText: string | null,
): {
    startOffset: number | null,
    endOffset: number | null,
    status: string,
} => {
    if (annotation.status === 'resolved') {
        return {
            startOffset: annotation.startOffset,
            endOffset: annotation.endOffset,
            status: annotation.status,
        };
    }

    if (blockText === null) {
        return {
            startOffset: null,
            endOffset: null,
            status: 'orphaned',
        };
    }

    const anchorText = annotation.anchorText?.trim() ?? '';
    const hasValidOffsets = annotation.startOffset !== null
        && annotation.endOffset !== null
        && annotation.startOffset >= 0
        && annotation.endOffset > annotation.startOffset
        && annotation.endOffset <= blockText.length;

    if (hasValidOffsets) {
        const startOffset = annotation.startOffset as number;
        const endOffset = annotation.endOffset as number;

        if (anchorText.length === 0) {
            return {
                startOffset,
                endOffset,
                status: 'active',
            };
        }

        const slice = blockText.slice(startOffset, endOffset);

        if (slice === anchorText) {
            return {
                startOffset,
                endOffset,
                status: 'active',
            };
        }
    }

    const anchorRange = findAnchorRange(blockText, anchorText, annotation.startOffset);

    if (!anchorRange) {
        return {
            startOffset: null,
            endOffset: null,
            status: 'orphaned',
        };
    }

    return {
        ...anchorRange,
        status: 'active',
    };
};

const parseSceneSnapshotBlocks = (value: unknown): SceneBlockRecord[] => {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
        .map(row => {
            const id = typeof row.id === 'string' ? row.id : createNodeId();
            const scriptId = typeof row.scriptId === 'string' ? row.scriptId : '';
            const blockType = typeof row.blockType === 'string' ? row.blockType : 'fountain_action';
            const orderNo = Number.isFinite(row.orderNo) ? Number(row.orderNo) : 0;
            const textContent = typeof row.textContent === 'string' ? row.textContent : '';
            const contentJson = typeof row.contentJson === 'string' ? row.contentJson : null;
            const sceneId = typeof row.sceneId === 'string' ? row.sceneId : null;
            const actId = typeof row.actId === 'string' ? row.actId : null;
            const columnGroupId = typeof row.columnGroupId === 'string' ? row.columnGroupId : null;
            const columnIndex = Number.isFinite(row.columnIndex) ? Number(row.columnIndex) : null;
            const createdAt = Number.isFinite(row.createdAt) ? Number(row.createdAt) : Date.now();
            const updatedAt = Number.isFinite(row.updatedAt) ? Number(row.updatedAt) : Date.now();

            return {
                id,
                scriptId,
                blockType,
                orderNo,
                textContent,
                contentJson,
                sceneId,
                actId,
                columnGroupId,
                columnIndex,
                createdAt,
                updatedAt,
            } satisfies SceneBlockRecord;
        });
};

export const useProductionSettingsController = ({
    scriptId,
    scriptRepository,
    indexSnapshot,
    confirmedCharacters,
    onRestoredDocument,
}: UseProductionSettingsControllerArgs): UseProductionSettingsControllerResult => {
    const repository = scriptRepository;
    const isEnabled = Boolean(scriptId);

    const [layers, setLayers] = useState<LayerRecord[]>([]);
    const [views, setViews] = useState<ViewRecord[]>([]);
    const [annotations, setAnnotations] = useState<AnnotationRecord[]>([]);
    const [scenes, setScenes] = useState<SceneRecord[]>([]);
    const [sceneVersions, setSceneVersions] = useState<SceneVersionRecord[]>([]);
    const [propsItems, setPropsItems] = useState<PropRecord[]>([]);
    const [costumeItems, setCostumeItems] = useState<CostumeRecord[]>([]);
    const [cueSheetItems, setCueSheetItems] = useState<CueSheetRecord[]>([]);
    const [members, setMembers] = useState<MemberRecord[]>([]);
    const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
    const [activeViewId, setActiveViewId] = useState<string | null>(null);
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const remapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const annotationsRef = useRef<AnnotationRecord[]>([]);
    const blockTextByIdRef = useRef<Map<string, string>>(new Map());

    useEffect(() => {
        annotationsRef.current = annotations;
    }, [annotations]);

    const loadBaseData = useCallback(async () => {
        if (!isEnabled || !scriptId) {
            setLayers([]);
            setViews([]);
            setAnnotations([]);
            setScenes([]);
            setSceneVersions([]);
            setPropsItems([]);
            setCostumeItems([]);
            setCueSheetItems([]);
            setMembers([]);
            setPermissions([]);
            setError(null);

            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const [
                nextLayers,
                nextViews,
                nextScenes,
                nextProps,
                nextCostumes,
                nextCueSheets,
                nextMembers,
                nextPermissions,
            ] = await Promise.all([
                repository.layers.list(scriptId),
                repository.views.list(scriptId),
                repository.scenes.list(scriptId),
                repository.props.list(scriptId),
                repository.costumes.list(scriptId),
                repository.cueSheets.list(scriptId),
                repository.members.list(scriptId),
                repository.permissions.list(scriptId),
            ]);

            const annotationRowsByLayer = await Promise.all(
                nextLayers.map(layer => repository.annotations.listByLayer(layer.id)),
            );

            const dedupedAnnotations = new Map<string, AnnotationRecord>();

            annotationRowsByLayer
                .flat()
                .forEach(row => {
                    dedupedAnnotations.set(row.id, row);
                });

            setLayers(nextLayers);
            setViews(nextViews);
            setScenes(nextScenes);
            setPropsItems(nextProps);
            setCostumeItems(nextCostumes);
            setCueSheetItems(nextCueSheets);
            setMembers(nextMembers);
            setPermissions(nextPermissions);
            setAnnotations(
                [...dedupedAnnotations.values()]
                    .sort((a, b) => a.createdAt - b.createdAt),
            );
        } catch (loadError) {
            console.error('Failed to load production settings', loadError);
            setError('Failed to load production data.');
        } finally {
            setIsLoading(false);
        }
    }, [
        isEnabled,
        repository,
        scriptId,
    ]);

    const loadSceneVersions = useCallback(async (sceneId: string | null) => {
        if (!isEnabled || !sceneId) {
            setSceneVersions([]);

            return;
        }

        try {
            const rows = await repository.sceneVersions.list(sceneId);

            setSceneVersions(rows);
        } catch (loadError) {
            console.error('Failed to load scene versions', loadError);
            setError('Failed to load scene versions.');
            setSceneVersions([]);
        }
    }, [isEnabled, repository]);

    useEffect(() => {
        void loadBaseData();
    }, [loadBaseData]);

    useEffect(() => {
        if (views.length === 0) {
            setActiveViewId(null);

            return;
        }

        setActiveViewId(previous => {
            if (previous && views.some(view => view.id === previous)) {
                return previous;
            }

            return views[0].id;
        });
    }, [views]);

    const activeSceneId = useMemo(() => {
        return resolveSceneIdFromActiveBlock(indexSnapshot, scenes, activeBlockId);
    }, [
        activeBlockId,
        indexSnapshot,
        scenes,
    ]);

    useEffect(() => {
        if (scenes.length === 0) {
            setSelectedSceneId(null);

            return;
        }

        setSelectedSceneId(previous => {
            if (previous && scenes.some(scene => scene.id === previous)) {
                return previous;
            }

            if (activeSceneId) {
                return activeSceneId;
            }

            return scenes[0].id;
        });
    }, [activeSceneId, scenes]);

    useEffect(() => {
        void loadSceneVersions(selectedSceneId);
    }, [loadSceneVersions, selectedSceneId]);

    useEffect(() => {
        return () => {
            if (!remapTimerRef.current) {
                return;
            }

            clearTimeout(remapTimerRef.current);
        };
    }, []);

    const runAnnotationLifecycleRemap = useCallback(async (blockTextById: ReadonlyMap<string, string>) => {
        if (!isEnabled) {
            return;
        }

        const currentAnnotations = annotationsRef.current;

        if (currentAnnotations.length === 0) {
            return;
        }

        const now = Date.now();
        const updates: AnnotationRecord[] = [];

        currentAnnotations.forEach(annotation => {
            const nextRange = resolveAnnotationRange(
                annotation,
                blockTextById.get(annotation.blockId) ?? null,
            );
            const didStartChange = nextRange.startOffset !== annotation.startOffset;
            const didEndChange = nextRange.endOffset !== annotation.endOffset;
            const didStatusChange = nextRange.status !== annotation.status;

            if (!didStartChange && !didEndChange && !didStatusChange) {
                return;
            }

            updates.push({
                ...annotation,
                startOffset: nextRange.startOffset,
                endOffset: nextRange.endOffset,
                status: nextRange.status,
                updatedAt: now,
            });
        });

        if (updates.length === 0) {
            return;
        }

        await Promise.all(
            updates.map(row => repository.annotations.upsert({
                id: row.id,
                blockId: row.blockId,
                layerId: row.layerId,
                annotationType: row.annotationType,
                startOffset: row.startOffset,
                endOffset: row.endOffset,
                anchorText: row.anchorText,
                payloadJson: row.payloadJson,
                status: row.status,
                createdBy: row.createdBy,
                createdAt: row.createdAt,
                updatedAt: row.updatedAt,
            })),
        );

        setAnnotations(previous => {
            const replacementById = new Map(updates.map(row => [row.id, row] as const));

            return previous.map(row => replacementById.get(row.id) ?? row);
        });
    }, [isEnabled, repository]);

    const onEditorValueChange = useCallback((value: ScriptDocument) => {
        const nextBlockTextById = collectBlockTextById(value);

        blockTextByIdRef.current = nextBlockTextById;

        if (remapTimerRef.current) {
            clearTimeout(remapTimerRef.current);
        }

        remapTimerRef.current = setTimeout(() => {
            void runAnnotationLifecycleRemap(nextBlockTextById);
        }, 300);
    }, [runAnnotationLifecycleRemap]);

    const onActiveBlockChange = useCallback((blockId: string | null) => {
        setActiveBlockId(blockId);
    }, []);

    const onCreateLayer = useCallback(async (input: CreateProductionLayerInput) => {
        if (!isEnabled || !scriptId) {
            return false;
        }

        const name = input.name.trim();

        if (!name) {
            return false;
        }

        const now = Date.now();
        const orderNo = layers.reduce((max, row) => Math.max(max, row.orderNo), -1) + 1;
        const colorHex = input.colorHex?.trim() || LAYER_COLOR_PALETTE[orderNo % LAYER_COLOR_PALETTE.length];

        try {
            await repository.layers.upsert({
                id: createNodeId(),
                scriptId,
                name,
                layerType: input.layerType.trim() || DEFAULT_LAYER_TYPE,
                department: input.department.trim() || DEFAULT_LAYER_DEPARTMENT,
                colorHex,
                isVisible: true,
                orderNo,
                createdBy: null,
                createdAt: now,
                updatedAt: now,
            });
            await loadBaseData();

            return true;
        } catch (createError) {
            console.error('Failed to create layer', createError);
            setError('Failed to create layer.');

            return false;
        }
    }, [
        isEnabled,
        layers,
        loadBaseData,
        repository,
        scriptId,
    ]);

    const onSetLayerVisibility = useCallback(async (layerId: string, isVisible: boolean) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.layers.setVisibility(layerId, isVisible, Date.now());
            setLayers(previous => {
                return previous.map(row => {
                    if (row.id !== layerId) {
                        return row;
                    }

                    return {
                        ...row,
                        isVisible,
                        updatedAt: Date.now(),
                    };
                });
            });
        } catch (updateError) {
            console.error('Failed to update layer visibility', updateError);
            setError('Failed to update layer visibility.');
        }
    }, [isEnabled, repository]);

    const onDeleteLayer = useCallback(async (layerId: string) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.layers.delete(layerId);
            await loadBaseData();
        } catch (deleteError) {
            console.error('Failed to delete layer', deleteError);
            setError('Failed to delete layer.');
        }
    }, [
        isEnabled,
        loadBaseData,
        repository,
    ]);

    const onCreateView = useCallback(async (input: CreateProductionViewInput) => {
        if (!isEnabled || !scriptId) {
            return false;
        }

        const name = input.name.trim();

        if (!name) {
            return false;
        }

        const now = Date.now();

        try {
            await repository.views.upsert({
                id: createNodeId(),
                scriptId,
                name,
                roleTemplate: input.roleTemplate,
                configJson: JSON.stringify({
                    visibleLayerIds: input.visibleLayerIds,
                    visibleBlockTypes: input.visibleBlockTypes,
                }),
                createdBy: null,
                createdAt: now,
                updatedAt: now,
            });
            await loadBaseData();

            return true;
        } catch (createError) {
            console.error('Failed to create view', createError);
            setError('Failed to create view.');

            return false;
        }
    }, [
        isEnabled,
        loadBaseData,
        repository,
        scriptId,
    ]);

    const onDeleteView = useCallback(async (viewId: string) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.views.delete(viewId);
            await loadBaseData();
        } catch (deleteError) {
            console.error('Failed to delete view', deleteError);
            setError('Failed to delete view.');
        }
    }, [
        isEnabled,
        loadBaseData,
        repository,
    ]);

    const onCreateAnnotation = useCallback(async (input: CreateProductionAnnotationInput) => {
        if (!isEnabled || !activeBlockId) {
            return false;
        }

        const payloadText = input.payloadText.trim();

        if (!payloadText) {
            return false;
        }

        const anchorText = input.anchorText.trim();
        const blockText = blockTextByIdRef.current.get(activeBlockId) ?? '';
        let startOffset = input.startOffset;
        let endOffset = input.endOffset;

        if (anchorText.length > 0 && (startOffset === null || endOffset === null || endOffset <= startOffset)) {
            const matchedStart = blockText.indexOf(anchorText);

            if (matchedStart >= 0) {
                startOffset = matchedStart;
                endOffset = matchedStart + anchorText.length;
            }
        }

        const hasOffsets = startOffset !== null
            && endOffset !== null
            && startOffset >= 0
            && endOffset > startOffset;
        const now = Date.now();

        try {
            await repository.annotations.upsert({
                id: createNodeId(),
                blockId: activeBlockId,
                layerId: input.layerId,
                annotationType: input.annotationType.trim() || 'note',
                startOffset: hasOffsets ? startOffset : null,
                endOffset: hasOffsets ? endOffset : null,
                anchorText: anchorText.length > 0 ? anchorText : null,
                payloadJson: JSON.stringify({
                    text: payloadText,
                }),
                status: hasOffsets ? 'active' : 'orphaned',
                createdBy: null,
                createdAt: now,
                updatedAt: now,
            });
            await loadBaseData();

            return true;
        } catch (createError) {
            console.error('Failed to create annotation', createError);
            setError('Failed to create annotation.');

            return false;
        }
    }, [
        activeBlockId,
        isEnabled,
        loadBaseData,
        repository,
    ]);

    const onSetAnnotationStatus = useCallback(async (annotationId: string, status: string) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.annotations.updateStatus(annotationId, status, Date.now());
            setAnnotations(previous => {
                return previous.map(row => {
                    if (row.id !== annotationId) {
                        return row;
                    }

                    return {
                        ...row,
                        status,
                        updatedAt: Date.now(),
                    };
                });
            });
        } catch (updateError) {
            console.error('Failed to update annotation status', updateError);
            setError('Failed to update annotation status.');
        }
    }, [isEnabled, repository]);

    const onDeleteAnnotation = useCallback(async (annotationId: string) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.annotations.delete(annotationId);
            setAnnotations(previous => previous.filter(row => row.id !== annotationId));
        } catch (deleteError) {
            console.error('Failed to delete annotation', deleteError);
            setError('Failed to delete annotation.');
        }
    }, [isEnabled, repository]);

    const onCreateSceneVersion = useCallback(async (input: CreateSceneVersionInput) => {
        if (!isEnabled || !scriptId) {
            return false;
        }

        try {
            const sceneBlocks = await repository.blocks.listByScene(input.sceneId);

            await repository.sceneVersions.insert({
                id: createNodeId(),
                sceneId: input.sceneId,
                message: input.message.trim() || null,
                blocksJson: JSON.stringify(sceneBlocks),
                createdAt: Date.now(),
            });
            await loadSceneVersions(input.sceneId);

            return true;
        } catch (createError) {
            console.error('Failed to create scene version', createError);
            setError('Failed to create scene snapshot.');

            return false;
        }
    }, [
        isEnabled,
        loadSceneVersions,
        repository,
        scriptId,
    ]);

    const onRestoreSceneVersion = useCallback(async (versionId: string) => {
        if (!isEnabled || !scriptId || !selectedSceneId) {
            return false;
        }

        try {
            const version = await repository.sceneVersions.getById(versionId);

            if (!version) {
                return false;
            }

            const snapshotRows = parseSceneSnapshotBlocks(JSON.parse(version.blocksJson));
            const currentSceneRows = await repository.blocks.listByScene(selectedSceneId);
            const snapshotIds = new Set(snapshotRows.map(row => row.id));
            const rowsToDelete = currentSceneRows
                .filter(row => !snapshotIds.has(row.id))
                .map(row => row.id);

            if (rowsToDelete.length > 0) {
                await repository.blocks.bulkDelete(rowsToDelete);
            }

            await repository.blocks.bulkUpsert(
                snapshotRows.map(row => ({
                    id: row.id,
                    scriptId,
                    blockType: row.blockType,
                    orderNo: row.orderNo,
                    textContent: row.textContent,
                    contentJson: row.contentJson,
                    sceneId: selectedSceneId,
                    actId: row.actId,
                    columnGroupId: row.columnGroupId,
                    columnIndex: row.columnIndex,
                    createdAt: row.createdAt,
                    updatedAt: Date.now(),
                })),
            );

            const restoredDocument = await scriptRepository.loadLatest(scriptId);

            if (restoredDocument) {
                onRestoredDocument(restoredDocument);
            }

            await loadBaseData();
            await loadSceneVersions(selectedSceneId);

            return true;
        } catch (restoreError) {
            console.error('Failed to restore scene version', restoreError);
            setError('Failed to restore scene snapshot.');

            return false;
        }
    }, [
        isEnabled,
        loadBaseData,
        loadSceneVersions,
        onRestoredDocument,
        repository,
        scriptId,
        scriptRepository,
        selectedSceneId,
    ]);

    const onCreateProp = useCallback(async (input: CreatePropInput) => {
        if (!isEnabled || !scriptId) {
            return false;
        }

        const name = input.name.trim();

        if (!name) {
            return false;
        }

        const now = Date.now();

        try {
            await repository.props.upsert({
                id: createNodeId(),
                scriptId,
                name,
                description: null,
                category: input.category.trim() || null,
                createdAt: now,
                updatedAt: now,
            });
            await loadBaseData();

            return true;
        } catch (createError) {
            console.error('Failed to create prop', createError);
            setError('Failed to create prop.');

            return false;
        }
    }, [
        isEnabled,
        loadBaseData,
        repository,
        scriptId,
    ]);

    const onDeleteProp = useCallback(async (propId: string) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.props.delete(propId);
            setPropsItems(previous => previous.filter(row => row.id !== propId));
        } catch (deleteError) {
            console.error('Failed to delete prop', deleteError);
            setError('Failed to delete prop.');
        }
    }, [isEnabled, repository]);

    const onCreateCostume = useCallback(async (input: CreateCostumeInput) => {
        if (!isEnabled || !scriptId) {
            return false;
        }

        const name = input.name.trim();

        if (!name || !input.characterId) {
            return false;
        }

        const now = Date.now();

        try {
            await repository.costumes.upsert({
                id: createNodeId(),
                scriptId,
                characterId: input.characterId,
                name,
                description: null,
                createdAt: now,
                updatedAt: now,
            });
            await loadBaseData();

            return true;
        } catch (createError) {
            console.error('Failed to create costume', createError);
            setError('Failed to create costume.');

            return false;
        }
    }, [
        isEnabled,
        loadBaseData,
        repository,
        scriptId,
    ]);

    const onDeleteCostume = useCallback(async (costumeId: string) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.costumes.delete(costumeId);
            setCostumeItems(previous => previous.filter(row => row.id !== costumeId));
        } catch (deleteError) {
            console.error('Failed to delete costume', deleteError);
            setError('Failed to delete costume.');
        }
    }, [isEnabled, repository]);

    const onCreateCueSheet = useCallback(async (input: CreateCueSheetInput) => {
        if (!isEnabled || !scriptId) {
            return false;
        }

        const name = input.name.trim();

        if (!name || !input.layerId) {
            return false;
        }

        const now = Date.now();

        try {
            await repository.cueSheets.upsert({
                id: createNodeId(),
                scriptId,
                layerId: input.layerId,
                name,
                cueOrderJson: JSON.stringify([]),
                createdAt: now,
                updatedAt: now,
            });
            await loadBaseData();

            return true;
        } catch (createError) {
            console.error('Failed to create cue sheet', createError);
            setError('Failed to create cue sheet.');

            return false;
        }
    }, [
        isEnabled,
        loadBaseData,
        repository,
        scriptId,
    ]);

    const onDeleteCueSheet = useCallback(async (cueSheetId: string) => {
        if (!isEnabled) {
            return;
        }

        try {
            await repository.cueSheets.delete(cueSheetId);
            setCueSheetItems(previous => previous.filter(row => row.id !== cueSheetId));
        } catch (deleteError) {
            console.error('Failed to delete cue sheet', deleteError);
            setError('Failed to delete cue sheet.');
        }
    }, [isEnabled, repository]);

    const parsedViews = useMemo(() => {
        const parsedById = new Map<string, ParsedViewConfig>();

        views.forEach(view => {
            parsedById.set(view.id, parseViewConfig(view.configJson));
        });

        return parsedById;
    }, [views]);

    const viewItems = useMemo<ProductionViewItem[]>(() => {
        return views.map(view => {
            const parsedConfig = parsedViews.get(view.id);

            return {
                id: view.id,
                name: view.name,
                roleTemplate: view.roleTemplate,
                visibleLayerIds: parsedConfig?.visibleLayerIds ?? [],
                visibleBlockTypes: parsedConfig?.visibleBlockTypes ?? [],
            };
        });
    }, [parsedViews, views]);

    const activeViewConfig = useMemo(() => {
        if (!activeViewId) {
            return null;
        }

        return parsedViews.get(activeViewId) ?? null;
    }, [activeViewId, parsedViews]);

    const visibleLayerIds = useMemo(() => {
        if (!activeViewConfig || activeViewConfig.visibleLayerIds.length === 0) {
            return layers
                .filter(layer => layer.isVisible)
                .map(layer => layer.id);
        }

        const layerIdSet = new Set(layers.map(layer => layer.id));

        return activeViewConfig.visibleLayerIds.filter(layerId => layerIdSet.has(layerId));
    }, [activeViewConfig, layers]);

    const editorAnnotations = useMemo<EditorAnnotationRecord[]>(() => {
        return annotations.map(annotation => ({
            id: annotation.id,
            blockId: annotation.blockId,
            layerId: annotation.layerId,
            annotationType: annotation.annotationType,
            startOffset: annotation.startOffset,
            endOffset: annotation.endOffset,
            status: annotation.status,
        }));
    }, [annotations]);

    const editorViewFilter = useMemo<EditorViewFilterRecord>(() => {
        return {
            visibleLayerIds,
            visibleBlockTypes: activeViewConfig?.visibleBlockTypes ?? DEFAULT_VIEW_BLOCK_TYPES,
        };
    }, [activeViewConfig, visibleLayerIds]);

    const activeBlockAnnotations = useMemo<ProductionAnnotationItem[]>(() => {
        if (!activeBlockId) {
            return [];
        }

        return annotations
            .filter(annotation => annotation.blockId === activeBlockId)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map(annotation => ({
                id: annotation.id,
                blockId: annotation.blockId,
                layerId: annotation.layerId,
                annotationType: annotation.annotationType,
                startOffset: annotation.startOffset,
                endOffset: annotation.endOffset,
                anchorText: annotation.anchorText,
                status: annotation.status,
                updatedAt: annotation.updatedAt,
            }));
    }, [activeBlockId, annotations]);

    const sceneLabelByHeadingBlockId = useMemo(() => {
        const labelByBlockId = new Map<string, string>();

        indexSnapshot?.blocks.forEach(block => {
            labelByBlockId.set(block.blockId, block.textContent);
        });

        return labelByBlockId;
    }, [indexSnapshot]);

    const sceneOptions = useMemo<ProductionSceneOption[]>(() => {
        return scenes.map((scene, index) => {
            const headingLabel = scene.headingBlockId
                ? sceneLabelByHeadingBlockId.get(scene.headingBlockId)
                : null;
            const normalizedHeadingLabel = headingLabel?.trim() ?? '';

            return {
                id: scene.id,
                label: normalizedHeadingLabel.length > 0
                    ? normalizedHeadingLabel
                    : `Scene ${index + 1}`,
            };
        });
    }, [sceneLabelByHeadingBlockId, scenes]);

    const layerItems = useMemo<ProductionLayerItem[]>(() => {
        return layers.map(layer => ({
            id: layer.id,
            name: layer.name,
            layerType: layer.layerType,
            department: layer.department,
            colorHex: layer.colorHex,
            isVisible: layer.isVisible,
            orderNo: layer.orderNo,
        }));
    }, [layers]);

    const sceneVersionItems = useMemo<ProductionSceneVersionItem[]>(() => {
        return sceneVersions.map(version => ({
            id: version.id,
            message: version.message,
            createdAt: version.createdAt,
        }));
    }, [sceneVersions]);

    const propItems = useMemo<ProductionPropItem[]>(() => {
        return propsItems.map(row => ({
            id: row.id,
            name: row.name,
            category: row.category,
        }));
    }, [propsItems]);

    const costumeRows = useMemo<ProductionCostumeItem[]>(() => {
        return costumeItems.map(row => ({
            id: row.id,
            name: row.name,
            characterId: row.characterId,
        }));
    }, [costumeItems]);

    const cueSheetRows = useMemo<ProductionCueSheetItem[]>(() => {
        return cueSheetItems.map(row => ({
            id: row.id,
            name: row.name,
            layerId: row.layerId,
        }));
    }, [cueSheetItems]);

    const memberRows = useMemo<ProductionMemberItem[]>(() => {
        return members.map(row => ({
            id: row.id,
            userId: row.userId,
            role: row.role,
            department: row.department,
        }));
    }, [members]);

    const permissionRows = useMemo<ProductionPermissionItem[]>(() => {
        return permissions.map(row => ({
            id: row.id,
            role: row.role,
            resourceType: row.resourceType,
            action: row.action,
        }));
    }, [permissions]);

    const panelData = useMemo<ProductionSettingsPanelData>(() => {
        return {
            isEnabled,
            isLoading,
            error,
            activeBlockId,
            activeViewId,
            selectedSceneId,
            layers: layerItems,
            views: viewItems,
            activeBlockAnnotations,
            sceneOptions,
            sceneVersions: sceneVersionItems,
            propsItems: propItems,
            costumeItems: costumeRows,
            cueSheetItems: cueSheetRows,
            characterOptions: [...confirmedCharacters],
            members: memberRows,
            permissions: permissionRows,
        };
    }, [
        activeBlockAnnotations,
        activeBlockId,
        activeViewId,
        confirmedCharacters,
        costumeRows,
        cueSheetRows,
        error,
        isEnabled,
        isLoading,
        layerItems,
        memberRows,
        permissionRows,
        propItems,
        sceneOptions,
        sceneVersionItems,
        selectedSceneId,
        viewItems,
    ]);

    const panelActions = useMemo<ProductionSettingsPanelActions>(() => {
        return {
            onReload: loadBaseData,
            onSetActiveView: viewId => {
                setActiveViewId(viewId);
            },
            onSelectScene: sceneId => {
                setSelectedSceneId(sceneId);
            },
            onCreateLayer,
            onSetLayerVisibility,
            onDeleteLayer,
            onCreateView,
            onDeleteView,
            onCreateAnnotation,
            onSetAnnotationStatus,
            onDeleteAnnotation,
            onCreateSceneVersion,
            onRestoreSceneVersion,
            onCreateProp,
            onDeleteProp,
            onCreateCostume,
            onDeleteCostume,
            onCreateCueSheet,
            onDeleteCueSheet,
        };
    }, [
        loadBaseData,
        onCreateAnnotation,
        onCreateCostume,
        onCreateCueSheet,
        onCreateLayer,
        onCreateProp,
        onCreateSceneVersion,
        onCreateView,
        onDeleteAnnotation,
        onDeleteCostume,
        onDeleteCueSheet,
        onDeleteLayer,
        onDeleteProp,
        onDeleteView,
        onRestoreSceneVersion,
        onSetAnnotationStatus,
        onSetLayerVisibility,
    ]);

    const panel = useMemo(() => ({
        data: panelData,
        actions: panelActions,
    }), [panelActions, panelData]);

    const editor = useMemo(() => ({
        annotations: editorAnnotations,
        viewFilter: editorViewFilter,
    }), [editorAnnotations, editorViewFilter]);

    const callbacks = useMemo(() => ({
        onEditorValueChange,
        onActiveBlockChange,
    }), [onActiveBlockChange, onEditorValueChange]);

    return {
        panel,
        editor,
        callbacks,
    };
};
