interface EditorPerfMetricsState {
    indexUpdateDurations: number[],
    sidebarSelectorDurations: number[],
    fullDocJsonSerializeCount: number,
    fullIndexBuildCount: number,
    structureRuntimeRebuildCount: number,
    characterRuntimeRebuildCount: number,
    characterDecorationRebuildCount: number,
    annotationDecorationRebuildCount: number,
    layerFilterDecorationRebuildCount: number,
    transactionBridgePatchCount: number,
    paginationRecalcCount: number,
    routeRenderCount: number,
    sidebarProjectionDeltaCount: number,
    sidebarProjectionFullRebuildCount: number,
    sidebarStorePatchCount: number,
}

const MAX_SAMPLES = 200;

const createInitialState = (): EditorPerfMetricsState => {
    return {
        indexUpdateDurations: [],
        sidebarSelectorDurations: [],
        fullDocJsonSerializeCount: 0,
        fullIndexBuildCount: 0,
        structureRuntimeRebuildCount: 0,
        characterRuntimeRebuildCount: 0,
        characterDecorationRebuildCount: 0,
        annotationDecorationRebuildCount: 0,
        layerFilterDecorationRebuildCount: 0,
        transactionBridgePatchCount: 0,
        paginationRecalcCount: 0,
        routeRenderCount: 0,
        sidebarProjectionDeltaCount: 0,
        sidebarProjectionFullRebuildCount: 0,
        sidebarStorePatchCount: 0,
    };
};

const getGlobalState = () => {
    const globalObject = globalThis as typeof globalThis & {
        __stagisticEditorPerfState?: EditorPerfMetricsState,
    };

    if (!globalObject.__stagisticEditorPerfState) {
        globalObject.__stagisticEditorPerfState = createInitialState();
    }

    return globalObject.__stagisticEditorPerfState;
};

const shouldTrack = () => {
    return typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
};

const pushSample = (samples: number[], durationMs: number) => {
    samples.push(durationMs);

    if (samples.length <= MAX_SAMPLES) {
        return;
    }

    samples.splice(0, samples.length - MAX_SAMPLES);
};

export const trackIndexUpdateDuration = (durationMs: number) => {
    if (!shouldTrack() || !Number.isFinite(durationMs)) {
        return;
    }

    pushSample(getGlobalState().indexUpdateDurations, durationMs);
};

export const trackSidebarSelectorDuration = (durationMs: number) => {
    if (!shouldTrack() || !Number.isFinite(durationMs)) {
        return;
    }

    pushSample(getGlobalState().sidebarSelectorDurations, durationMs);
};

export const incrementPaginationRecalcCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().paginationRecalcCount += 1;
};

export const incrementFullDocJsonSerializeCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().fullDocJsonSerializeCount += 1;
};

export const incrementFullIndexBuildCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().fullIndexBuildCount += 1;
};

export const incrementStructureRuntimeRebuildCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().structureRuntimeRebuildCount += 1;
};

export const incrementCharacterRuntimeRebuildCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().characterRuntimeRebuildCount += 1;
};

export const incrementCharacterDecorationRebuildCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().characterDecorationRebuildCount += 1;
};

export const incrementAnnotationDecorationRebuildCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().annotationDecorationRebuildCount += 1;
};

export const incrementLayerFilterDecorationRebuildCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().layerFilterDecorationRebuildCount += 1;
};

export const incrementTransactionBridgePatchCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().transactionBridgePatchCount += 1;
};

export const incrementRouteRenderCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().routeRenderCount += 1;
};

export const incrementSidebarProjectionDeltaCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().sidebarProjectionDeltaCount += 1;
};

export const incrementSidebarProjectionFullRebuildCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().sidebarProjectionFullRebuildCount += 1;
};

export const incrementSidebarStorePatchCount = () => {
    if (!shouldTrack()) {
        return;
    }

    getGlobalState().sidebarStorePatchCount += 1;
};

export const getEditorPerfMetricsSnapshot = () => {
    return getGlobalState();
};

export const resetEditorPerfMetrics = () => {
    if (!shouldTrack()) {
        return;
    }

    const state = getGlobalState();

    state.indexUpdateDurations = [];
    state.sidebarSelectorDurations = [];
    state.fullDocJsonSerializeCount = 0;
    state.fullIndexBuildCount = 0;
    state.structureRuntimeRebuildCount = 0;
    state.characterRuntimeRebuildCount = 0;
    state.characterDecorationRebuildCount = 0;
    state.annotationDecorationRebuildCount = 0;
    state.layerFilterDecorationRebuildCount = 0;
    state.transactionBridgePatchCount = 0;
    state.paginationRecalcCount = 0;
    state.routeRenderCount = 0;
    state.sidebarProjectionDeltaCount = 0;
    state.sidebarProjectionFullRebuildCount = 0;
    state.sidebarStorePatchCount = 0;
};
