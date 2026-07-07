import {BASIC_DEFAULTS} from '@stagistic/export';
import type {JSX} from 'react';

import {BasicExportTemplate} from './templates/BasicExportTemplate';

export type ExportTemplateComponent = () => JSX.Element;

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
};
