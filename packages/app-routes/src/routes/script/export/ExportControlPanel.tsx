import {
    BASIC_DEFAULTS,
    type BasicExportConfig,
} from '@stagistic/export';
import {ExportPanel, formControlStyles} from '@stagistic/ui';
import {
    useMemo,
    useState,
} from 'react';

import styles from './ExportControlPanel.module.css';
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
            </div>
            <aside aria-label="Export controls">
                <div className={styles.template}>
                    <div className={formControlStyles.field}>
                        <label
                            className={formControlStyles.label}
                            htmlFor="export-template"
                        >
                            Template
                        </label>
                        <TemplatePicker
                            id="export-template"
                            value={templateId}
                            onChange={setTemplateId}
                        />
                    </div>
                    {templateId === 'integratedScore' ? <IntegratedScoreWarning config={config} /> : null}
                </div>
                <ExportPanel>
                    <TemplateComponent
                        key={templateKey}
                        config={config}
                        onConfigChange={setConfig}
                    />
                </ExportPanel>
            </aside>
        </div>
    );
};
