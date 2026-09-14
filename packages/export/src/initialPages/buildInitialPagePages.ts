import type {EditorSettings} from '@stagistic/script';

import type {InitialPagePlan} from '../plan';
import {
    buildCharactersAndPlacesPages,
    type VisualPage,
} from './buildCharactersAndPlacesPages';
import {buildContentsPages} from './contents/buildContentsPages';
import type {ContentsPageNumbers} from './contents/contentsPageNumbers';

type InitialPageBuilder = (
    plan: InitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
) => VisualPage[];

const BUILDERS: Record<InitialPagePlan['kind'], InitialPageBuilder> = {
    'characters-and-places': (plan, settings) => plan.kind === 'characters-and-places'
        ? buildCharactersAndPlacesPages(plan, settings)
        : [],
    contents: (plan, settings, pageNumbers) => plan.kind === 'contents'
        ? buildContentsPages(plan, settings, pageNumbers)
        : [],
};

export const buildInitialPagePages = (
    plan: InitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
): VisualPage[] => BUILDERS[plan.kind](plan, settings, pageNumbers);
