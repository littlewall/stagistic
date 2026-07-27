import type {EditorSettings} from '@stagistic/script';

import type {InitialPagePlan} from '../plan';
import {
    buildCharactersAndPlacesPages,
    type VisualPage,
} from './buildCharactersAndPlacesPages';

type InitialPageBuilderMap = {
    [Kind in InitialPagePlan['kind']]: (
        plan: Extract<InitialPagePlan, {kind: Kind}>,
        settings: EditorSettings,
    ) => VisualPage[];
};

const BUILDERS: InitialPageBuilderMap = {
    'characters-and-places': buildCharactersAndPlacesPages,
};

export const buildInitialPagePages = (
    plan: InitialPagePlan,
    settings: EditorSettings,
): VisualPage[] => {
    const builder = BUILDERS[plan.kind] as (
        value: InitialPagePlan,
        valueSettings: EditorSettings,
    ) => VisualPage[];

    return builder(plan, settings);
};
