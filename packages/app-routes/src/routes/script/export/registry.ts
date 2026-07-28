import {
    BASIC_DEFAULTS,
    type BasicExportConfig,
    INTEGRATED_SCORE_DEFAULTS,
} from '@stagistic/export';
import type {JSX} from 'react';

import {BasicExportTemplate} from './templates/BasicExportTemplate';
import {IntegratedScoreExportTemplate} from './templates/IntegratedScoreExportTemplate';

export type ExportTemplateComponent = (props: {
    config: BasicExportConfig,
    onConfigChange: (config: BasicExportConfig) => void,
}) => JSX.Element;

export interface ExportTemplateDefinition {
    label: string,
    Component: ExportTemplateComponent,
    defaults: unknown,
}

export const EXPORT_TEMPLATES: Record<string, ExportTemplateDefinition> = {
    basic: {
        label: 'Basic',
        Component: BasicExportTemplate,
        defaults: BASIC_DEFAULTS,
    },
    integratedScore: {
        label: 'Integrated score',
        Component: IntegratedScoreExportTemplate,
        defaults: INTEGRATED_SCORE_DEFAULTS,
    },
};
