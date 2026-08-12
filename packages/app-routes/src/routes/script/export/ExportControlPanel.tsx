import {
    BASIC_DEFAULTS,
    type BasicExportConfig,
} from '@stagistic/export';
import {
    useMemo,
    useState,
} from 'react';

import styles from './ExportControlPanel.module.css';
import {ExportDownloadButton} from './ExportDownloadButton';
import {IntegratedScoreWarning} from './IntegratedScoreWarning';
import {EXPORT_TEMPLATES} from './registry';
import {TemplatePicker} from './TemplatePicker';

export const ExportControlPanel = () => {
    const [templateId, setTemplateId] = useState('basic');
    const [config, setConfig] = useState<BasicExportConfig>(() => structuredClone(BASIC_DEFAULTS));
    const template = EXPORT_TEMPLATES[templateId] ?? EXPORT_TEMPLATES.basic;
    const TemplateComponent = template.Component;
    const templateKey = useMemo(() => templateId, [templateId]);

    return (
        <div className={styles.panel}>
            <div className={styles.header}>
                <h1 className={styles.title}>Export</h1>
                <ExportDownloadButton />
            </div>
            <aside className={styles.controls} aria-label="Export controls">
                <label className={styles.templateField}>
                    <span>Template</span>
                    <TemplatePicker value={templateId} onChange={setTemplateId} />
                </label>
                {templateId === 'integratedScore' ? <IntegratedScoreWarning config={config} /> : null}
                <TemplateComponent
                    key={templateKey}
                    config={config}
                    onConfigChange={setConfig}
                />
            </aside>
        </div>
    );
};
