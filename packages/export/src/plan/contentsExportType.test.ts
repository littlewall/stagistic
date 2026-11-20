import {expect, it} from 'vite-plus/test';

import {
    BASIC_DEFAULTS,
    type ContentsVariant,
    INTEGRATED_SCORE_DEFAULTS,
} from '../model/config';
import {numberedScript} from '../test/numberedScript';
import {deriveBasicExportPlan} from './deriveBasicExportPlan';
import {deriveIntegratedScoreExportPlan} from './deriveIntegratedScoreExportPlan';

it.each<ContentsVariant>([
    'scenes',
    'musical-numbers',
    'scenes-and-musical-numbers',
])('limits basic contents to Scenes even for a saved %s config', variant => {
    const plan = deriveBasicExportPlan({...BASIC_DEFAULTS, initialPages: {...BASIC_DEFAULTS.initialPages, contents: {enabled: true, variant}}}, numberedScript);

    expect(plan.leadingPages.initialPages.find(page => page.kind === 'contents')?.variant).toBe('scenes');
});

it.each<ContentsVariant>([
    'scenes',
    'musical-numbers',
    'scenes-and-musical-numbers',
])('keeps %s contents available for Integrated score', variant => {
    const config = {
        ...INTEGRATED_SCORE_DEFAULTS,
        initialPages: {...INTEGRATED_SCORE_DEFAULTS.initialPages, contents: {enabled: true, variant}},
    };
    const plan = deriveIntegratedScoreExportPlan(config, numberedScript);

    expect(plan.leadingPages.initialPages.find(page => page.kind === 'contents')?.variant).toBe(variant);
});

it('defaults to Scenes for Basic and scenes/music for Integrated score', () => {
    expect(BASIC_DEFAULTS.initialPages.contents.variant).toBe('scenes');
    expect(INTEGRATED_SCORE_DEFAULTS.initialPages.contents.variant).toBe('scenes-and-musical-numbers');
});
