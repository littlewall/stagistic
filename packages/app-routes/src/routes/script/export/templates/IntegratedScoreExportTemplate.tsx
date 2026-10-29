import {
    type BasicExportConfig,
    deriveIntegratedScoreExportPlan,
} from '@stagistic/export';

import {BasicExportTemplate} from './BasicExportTemplate';

/** Integrated score also allows music and combined contents. */
export const IntegratedScoreExportTemplate = ({
    config,
    onConfigChange,
}: {
    config: BasicExportConfig,
    onConfigChange: (config: BasicExportConfig) => void,
}) => (
    <BasicExportTemplate
        allowMusicContents
        config={config}
        onConfigChange={onConfigChange}
        derive={deriveIntegratedScoreExportPlan}
    />
);
