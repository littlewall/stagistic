import type {BasicExportConfig} from '@stagistic/export';
import {deriveIntegratedScoreExportPlan} from '@stagistic/export';

import {BasicExportTemplate} from './BasicExportTemplate';

/** The score template intentionally exposes the same settings as Basic. */
export const IntegratedScoreExportTemplate = ({
    config,
    onConfigChange,
}: {
    config: BasicExportConfig,
    onConfigChange: (config: BasicExportConfig) => void,
}) => (
    <BasicExportTemplate
        config={config}
        onConfigChange={onConfigChange}
        derive={deriveIntegratedScoreExportPlan}
    />
);
