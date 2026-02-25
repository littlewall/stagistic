import {useStore} from '@tanstack/react-store';
import {
    createStore,
    type Store,
} from '@tanstack/store';

import type {
    ScriptStateSidebarTab,
    ScriptStateUiSnapshot,
    ScriptStateUiStore,
} from './types';

const DEFAULT_UI_STATE: ScriptStateUiSnapshot = {
    activeBlockId: null,
    sidebarTab: 'structure',
    scrollPosition: 0,
};

export const createScriptStateUiStore = (
    initialState?: Partial<ScriptStateUiSnapshot>,
): ScriptStateUiStore => {
    const store = createStore<ScriptStateUiSnapshot>({
        ...DEFAULT_UI_STATE,
        ...initialState,
    });

    return {
        store,
        mutators: {
            setActiveBlockId: blockId => {
                store.setState(previous => {
                    if (previous.activeBlockId === blockId) {
                        return previous;
                    }

                    return {
                        ...previous,
                        activeBlockId: blockId,
                    };
                });
            },
            setSidebarTab: tab => {
                store.setState(previous => {
                    if (previous.sidebarTab === tab) {
                        return previous;
                    }

                    return {
                        ...previous,
                        sidebarTab: tab,
                    };
                });
            },
            setScrollPosition: position => {
                store.setState(previous => {
                    if (previous.scrollPosition === position) {
                        return previous;
                    }

                    return {
                        ...previous,
                        scrollPosition: position,
                    };
                });
            },
        },
    };
};

export const useScriptStateUiSelector = <TSelected>(
    store: Store<ScriptStateUiSnapshot>,
    selector: (snapshot: ScriptStateUiSnapshot) => TSelected,
    compare?: (left: TSelected, right: TSelected) => boolean,
) => {
    return useStore(store, selector, compare);
};

export const setScriptStateSidebarTab = (
    state: ScriptStateUiStore,
    tab: ScriptStateSidebarTab,
) => {
    state.mutators.setSidebarTab(tab);
};
