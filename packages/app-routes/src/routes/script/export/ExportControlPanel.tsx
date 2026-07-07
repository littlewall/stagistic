import {
    useMemo,
    useState,
} from 'react';

import styles from './ExportControlPanel.module.css';
import {ExportDownloadButton} from './ExportDownloadButton';
import {EXPORT_TEMPLATES} from './registry';
import {TemplatePicker} from './TemplatePicker';

export const ExportControlPanel = () => {
    const [templateId, setTemplateId] = useState('basic');
    const template = EXPORT_TEMPLATES[templateId] ?? EXPORT_TEMPLATES.basic;
    const TemplateComponent = template.Component;
    const templateKey = useMemo(() => templateId, [templateId]);

    return (
        <aside className={styles.panel} aria-label="Export controls">
            <div className={styles.header}>
                <h1 className={styles.title}>Export</h1>
                <ExportDownloadButton />
            </div>
            <label className={styles.templateField}>
                <span>Template</span>
                <TemplatePicker value={templateId} onChange={setTemplateId} />
            </label>
            <TemplateComponent key={templateKey} />
        </aside>
    );
};
