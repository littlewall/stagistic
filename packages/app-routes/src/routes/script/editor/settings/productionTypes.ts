import type {FountainElementType} from '@stagistic/script-core';

export interface ProductionLayerItem {
    id: string,
    name: string,
    layerType: string,
    department: string,
    colorHex: string | null,
    isVisible: boolean,
    orderNo: number,
}

export interface ProductionViewItem {
    id: string,
    name: string,
    roleTemplate: string | null,
    visibleLayerIds: string[],
    visibleBlockTypes: FountainElementType[],
}

export interface ProductionAnnotationItem {
    id: string,
    blockId: string,
    layerId: string,
    annotationType: string,
    startOffset: number | null,
    endOffset: number | null,
    anchorText: string | null,
    status: string,
    updatedAt: number,
}

export interface ProductionSceneOption {
    id: string,
    label: string,
}

export interface ProductionSceneVersionItem {
    id: string,
    message: string | null,
    createdAt: number,
}

export interface ProductionPropItem {
    id: string,
    name: string,
    category: string | null,
}

export interface ProductionCostumeItem {
    id: string,
    name: string,
    characterId: string,
}

export interface ProductionCueSheetItem {
    id: string,
    name: string,
    layerId: string,
}

export interface ProductionCharacterOption {
    id: string,
    key: string,
}

export interface ProductionMemberItem {
    id: string,
    userId: string,
    role: string,
    department: string | null,
}

export interface ProductionPermissionItem {
    id: string,
    role: string,
    resourceType: string,
    action: string,
}

export interface ProductionSettingsPanelData {
    isEnabled: boolean,
    isLoading: boolean,
    error: string | null,
    activeBlockId: string | null,
    activeViewId: string | null,
    selectedSceneId: string | null,
    layers: ProductionLayerItem[],
    views: ProductionViewItem[],
    activeBlockAnnotations: ProductionAnnotationItem[],
    sceneOptions: ProductionSceneOption[],
    sceneVersions: ProductionSceneVersionItem[],
    propsItems: ProductionPropItem[],
    costumeItems: ProductionCostumeItem[],
    cueSheetItems: ProductionCueSheetItem[],
    characterOptions: ProductionCharacterOption[],
    members: ProductionMemberItem[],
    permissions: ProductionPermissionItem[],
}

export interface CreateProductionLayerInput {
    name: string,
    layerType: string,
    department: string,
    colorHex: string | null,
}

export interface CreateProductionViewInput {
    name: string,
    roleTemplate: string | null,
    visibleLayerIds: string[],
    visibleBlockTypes: FountainElementType[],
}

export interface CreateProductionAnnotationInput {
    layerId: string,
    annotationType: string,
    anchorText: string,
    payloadText: string,
    startOffset: number | null,
    endOffset: number | null,
}

export interface CreateSceneVersionInput {
    sceneId: string,
    message: string,
}

export interface CreatePropInput {
    name: string,
    category: string,
}

export interface CreateCostumeInput {
    name: string,
    characterId: string,
}

export interface CreateCueSheetInput {
    name: string,
    layerId: string,
}

export interface ProductionSettingsPanelActions {
    onReload: () => Promise<void>,
    onSetActiveView: (viewId: string | null) => void,
    onSelectScene: (sceneId: string) => void,
    onCreateLayer: (input: CreateProductionLayerInput) => Promise<boolean>,
    onSetLayerVisibility: (layerId: string, isVisible: boolean) => Promise<void>,
    onDeleteLayer: (layerId: string) => Promise<void>,
    onCreateView: (input: CreateProductionViewInput) => Promise<boolean>,
    onDeleteView: (viewId: string) => Promise<void>,
    onCreateAnnotation: (input: CreateProductionAnnotationInput) => Promise<boolean>,
    onSetAnnotationStatus: (annotationId: string, status: string) => Promise<void>,
    onDeleteAnnotation: (annotationId: string) => Promise<void>,
    onCreateSceneVersion: (input: CreateSceneVersionInput) => Promise<boolean>,
    onRestoreSceneVersion: (versionId: string) => Promise<boolean>,
    onCreateProp: (input: CreatePropInput) => Promise<boolean>,
    onDeleteProp: (propId: string) => Promise<void>,
    onCreateCostume: (input: CreateCostumeInput) => Promise<boolean>,
    onDeleteCostume: (costumeId: string) => Promise<void>,
    onCreateCueSheet: (input: CreateCueSheetInput) => Promise<boolean>,
    onDeleteCueSheet: (cueSheetId: string) => Promise<void>,
}

export interface ProductionSettingsPanelProps {
    data: ProductionSettingsPanelData,
    actions: ProductionSettingsPanelActions,
}
