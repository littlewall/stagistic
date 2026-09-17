import type {EditorSettings} from '@stagistic/script';

import type {InitialPagePlan} from '../plan';
import type {InitialPageVisualPage} from '../visualLine';
import {buildCharactersAndPlacesPages} from './buildCharactersAndPlacesPages';
import {buildVocalRangesPages} from './buildVocalRangesPages';
import {buildContentsPages} from './contents/buildContentsPages';
import type {ContentsPageNumbers} from './contents/contentsPageNumbers';

type InitialPageBuilder = (
    plan: InitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
) => InitialPageVisualPage[];

const BUILDERS: Record<InitialPagePlan['kind'], InitialPageBuilder> = {
    'characters-and-places': (plan, settings) => plan.kind === 'characters-and-places'
        ? buildCharactersAndPlacesPages(plan, settings)
        : [],
    contents: (plan, settings, pageNumbers) => plan.kind === 'contents'
        ? buildContentsPages(plan, settings, pageNumbers)
        : [],
    'vocal-ranges': (plan, settings) => plan.kind === 'vocal-ranges'
        ? buildVocalRangesPages(plan, settings)
        : [],
};

export const buildInitialPagePages = (
    plan: InitialPagePlan,
    settings: EditorSettings,
    pageNumbers?: ContentsPageNumbers,
): InitialPageVisualPage[] => BUILDERS[plan.kind](plan, settings, pageNumbers);
