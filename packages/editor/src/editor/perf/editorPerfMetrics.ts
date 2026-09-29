interface EditorPerfMetricsState {
    indexUpdateDurations: number[];
    sidebarSelectorDurations: number[];
    fullDocJsonSerializeCount: number;
    fullIndexBuildCount: number;
    structureRuntimeRebuildCount: number;
    characterRuntimeRebuildCount: number;
    characterDecorationRebuildCount: number;
    transactionBridgePatchCount: number;
    paginationRecalcCount: number;
    routeRenderCount: number;
    sidebarStorePatchCount: number;
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
        transactionBridgePatchCount: 0,
        paginationRecalcCount: 0,
        routeRenderCount: 0,
        sidebarStorePatchCount: 0,
    };
};

const getGlobalState = () => {
    const globalObject = globalThis as typeof globalThis & {
        __stagisticEditorPerfState?: EditorPerfMetricsState;
    };

    if (!globalObject.__stagisticEditorPerfState) {
        globalObject.__stagisticEditorPerfState = createInitialState();
    }

    return globalObject.__stagisticEditorPerfState;
};

const shouldTrack = () => {
    // The editor package has no Node typings; `process` exists only in tests/Node.
    const {process} = globalThis as {process?: {env: {NODE_ENV?: string}}};

    return process !== undefined && process.env.NODE_ENV !== 'production';
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
    state.transactionBridgePatchCount = 0;
    state.paginationRecalcCount = 0;
    state.routeRenderCount = 0;
    state.sidebarStorePatchCount = 0;
};
